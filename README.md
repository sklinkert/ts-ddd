# ts-ddd: Build Domain-Driven Nest.js Services Fast

[![CI](https://github.com/sklinkert/ts-ddd/actions/workflows/ci.yml/badge.svg)](https://github.com/sklinkert/ts-ddd/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](tsconfig.json)

Opinionated Nest.js / TypeScript Domain-Driven Design template, modelled on
[`sklinkert/go-ddd`](https://github.com/sklinkert/go-ddd). It jump-starts
production-grade TypeScript backends that keep business rules, infrastructure,
and delivery code cleanly separated.

It ships two example aggregates — `Seller` and `Product` (a Product references a Seller
by ID) — wired through every layer plus the patterns people copy templates for:

- **Compile-time validation guarantee** — repositories only accept `ValidatedSeller` /
  `ValidatedProduct`; you _cannot_ persist an unvalidated aggregate.
- **Money value object** — integer cents + ISO 4217 currency; no floats, ever.
- **Transactional outbox** — domain events commit with the business write; a
  `SKIP LOCKED` relay publishes them at-least-once.
- **Race-safe idempotent writes** — Stripe-style `Idempotency-Key` with atomic claim,
  replay, conflict detection, and crash takeover after a TTL.
- **Production surface** — `/healthz` + `/readyz` probes, graceful shutdown, structured
  JSON logging with request IDs, OpenAPI spec + Swagger UI, Docker Compose stack, CI.

📚 **[DDD & CQRS Principles Guide](DDD_CQRS_PRINCIPLES.md)** — every pattern explained
next to its implementation.

## Quickstart (Docker)

```bash
docker compose up --build -d      # postgres → migrations → app on :3000

curl localhost:3000/healthz       # {"status":"ok"}
curl localhost:3000/readyz        # {"status":"ok"} — checks the DB

# Create a seller
curl -X POST localhost:3000/api/v1/sellers \
  -H 'content-type: application/json' \
  -d '{"name":"Acme","email":"acme@example.com"}'
# → 201 { "id": "<uuid>", ... }

# Create a product — idempotently
curl -X POST localhost:3000/api/v1/products \
  -H 'content-type: application/json' \
  -H 'Idempotency-Key: 11111111-1111-7111-8111-111111111111' \
  -d '{"sellerId":"<uuid>","name":"Widget","priceCents":1299,"currency":"USD"}'
# Repeating the exact same request replays the same response — no duplicate row.
# Same key with a different body → 409 Conflict.
```

Interactive API docs are served at [`/docs`](http://localhost:3000/docs); the spec is
checked in at [`api/openapi.yaml`](api/openapi.yaml) and CI fails if it drifts.

## Anatomy of a write

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant R as Controller
    participant H as Command Handler
    participant D as Domain
    participant P as Postgres

    C->>M: POST /api/v1/products (Idempotency-Key)
    M->>P: claim key atomically (pending row)
    M->>R: proceed (first request wins)
    R->>H: CreateProductCommand
    H->>D: Product.create(name, Money, sellerId)
    D->>D: validate() → ValidatedProduct + ProductCreated event
    H->>P: INSERT product + outbox event (one transaction)
    H-->>R: ProductId
    R-->>C: 201 Created (JSON)
    M->>P: store response for replay
    Note over P: Outbox relay publishes<br/>ProductCreated asynchronously
```

## Stack

| Concern     | Choice                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| HTTP        | `@nestjs/core` + Express, REST under `/api/v1`                            |
| Application | `@nestjs/cqrs` (CommandBus / QueryBus / EventBus)                         |
| Persistence | `@mikro-orm/postgresql` (Data Mapper + Unit of Work)                      |
| Migrations  | `@mikro-orm/migrations` (programmatic runner in `src/cli/migrate.ts`)     |
| API docs    | `@nestjs/swagger` — UI at `/docs`, spec in `api/openapi.yaml`             |
| Scheduling  | `@nestjs/schedule` (used by the outbox publisher)                         |
| IDs         | UUIDv7 via `uuid`                                                         |
| Validation  | `class-validator` on HTTP DTOs only; domain uses plain TS guards          |
| Logging     | JSON lines via `LOG_FORMAT=json` (swap in `nestjs-pino` if you need more) |
| Testing     | Jest unit tests + `@testcontainers/postgresql` integration tests          |
| Tooling     | Dockerfile, docker-compose, Makefile, GitHub Actions CI + release         |

## Layering

```
src/
  modules/<bounded-context>/
    domain/          # pure TS — aggregates, value objects, repository interfaces, events
    application/     # use cases — commands, queries, handlers; orchestration only
    infrastructure/  # MikroORM models, mappers, repository implementations
    interface/       # HTTP controllers + DTOs
    <context>.module.ts
  shared/
    domain/          # AggregateRoot, DomainEvent, branded IDs, Money, DomainError
    infrastructure/  # outbox, idempotency, JSON logger, MikroORM migrations
    interface/       # global filter, middleware, health probes
  cli/migrate.ts     # programmatic migration runner (used by Docker)
  main.ts
  app.module.ts
  app.setup.ts       # shared app config (prefix, pipes, filters) for main + tests
  mikro-orm.config.ts
```

**Rules of the road**

1. `domain/` imports nothing from `application/`, `infrastructure/`, or framework code
   (Nest, MikroORM, class-validator). It is pure TypeScript and can be unit-tested
   without any container or DB.
2. `application/` orchestrates: it calls repositories, mutates aggregates, and returns
   data. It does not know about HTTP, ORMs, or events being published asynchronously.
3. `infrastructure/` is the only place that talks to the database. It owns ORM
   entities, mappers, and repository implementations.
4. `interface/` is the only place that talks to HTTP. Controllers translate DTOs into
   commands/queries and aggregate results into responses.
5. Cross-aggregate references go by ID (e.g. `Product.sellerId: SellerId`) — no
   navigation properties, no eager-loaded joins on the domain.

## Key patterns

### Aggregate roots are pure TS

`Seller` and `Product` extend `AggregateRoot`, have a **private constructor**, and
expose two factories:

- `Seller.create({ … })` — used by command handlers; runs invariants and records a
  domain event.
- `Seller.rehydrate({ … })` — used by the mapper; runs invariants but emits no event.

Behaviour methods (`rename`, `changePrice`) mutate via private setters, re-run
invariants, and append events.

### Money value object

Prices are `Money` — integer minor units plus an ISO 4217 currency
(`src/shared/domain/money.ts`). `Money.of(1299, 'USD')` validates on construction,
so aggregates holding a `Money` never re-check price rules. Arithmetic across
currencies throws. Postgres stores the amount as `bigint`.

### ValidatedEntity wrapper

The least intuitive pattern; the most important one. Repositories accept only
`ValidatedSeller` / `ValidatedProduct` for writes, never the bare aggregate:

```ts
abstract save(p: ValidatedProduct): Promise<Product>;
```

Each wrapper has a **private constructor** and an `__unsafeWrap(entity, guard)` static
that checks a module-private `Symbol`. The only path through the guard is
`entity.toValidated()`, which re-runs `validate()` first. The repository signature
therefore enforces "you cannot persist an entity that has not been validated" at
compile time — TypeScript checks private constructors nominally.

### CQRS handlers wrap one Unit of Work

Each command handler runs inside `em.transactional(...)`. The repository's `save()`
also persists `OutboxRow`s emitted by the aggregate **inside the same transaction**.
Handlers do **not** call `EventBus.publish()` directly — the outbox is the sole
publisher.

### Transactional outbox

- Domain events emitted by an aggregate are persisted to the `outbox` table as part
  of the business transaction (`AggregateRoot.pullDomainEvents()` →
  `OutboxRecorder.toRow()`).
- `OutboxPublisher` polls every second with
  `SELECT … FOR UPDATE SKIP LOCKED`, publishes through `EventBus.publish()`, then
  stamps `published_at`. `SKIP LOCKED` makes it safe to run multiple instances.
- Subscribers register with `@EventsHandler(IntegrationEvent)` and dispatch on
  `event.eventType`.

### Idempotent writes

- `IdempotencyMiddleware` is applied to `POST`/`PUT`/`PATCH` routes.
- Reads the `Idempotency-Key` header; if missing, the request passes through.
- Hash of the request body is keyed by `(key, method, path)` (Stripe-style scope —
  the same key on a different endpoint is treated as a new request).
- The claim is **atomic** (`INSERT … ON CONFLICT`): concurrent duplicates get
  `409` + `Retry-After` while the first request is in flight — no check-then-write race.
- Hit with matching hash → cached response is replayed.
- Hit with different hash → `409 Conflict`.
- A pending claim older than `IDEMPOTENCY_PENDING_TTL_MS` (default 5 min) is treated
  as abandoned (its holder crashed) and taken over by the next retry.

### Production hardening

- **Graceful shutdown** — `app.enableShutdownHooks()`; SIGTERM drains in-flight
  requests and closes the ORM before exit. The process exits nonzero if startup fails.
- **Structured logging** — `LOG_FORMAT=json` emits one JSON line per entry;
  every request gets an `X-Request-Id` (propagated or generated) and one access-log
  line with method, path, status, and latency.
- **Probes** — `/healthz` (liveness) and `/readyz` (checks the DB), outside the
  API prefix, ready for Kubernetes.

## How to add a new aggregate

Use `Seller` as the canonical reference. Steps:

1. **Branded ID** — `src/modules/<ctx>/domain/<entity>-id.ts`.
2. **Domain events** — one class per event, implements `DomainEvent`.
3. **Aggregate** — `<entity>.ts` extending `AggregateRoot`. Private constructor,
   `create()` and `rehydrate()` static factories, behaviour methods, private
   `validate()`. Add `toValidated()` returning `Validated<Entity>`.
4. **ValidatedEntity wrapper** — `validated-<entity>.ts` with private constructor +
   symbol guard.
5. **Repository interface** — `abstract class <Entity>Repository { … }`; the abstract
   class doubles as the Nest DI token.
6. **ORM entity** — `infrastructure/persistence/<entity>.orm-entity.ts`. No
   navigation references to other aggregates — IDs only.
7. **Mapper** — static `toDomain` / `toOrm`.
8. **Repository implementation** — call `OutboxRecorder.toRow()` for each pulled
   domain event inside `em.flush()`.
9. **CQRS** — one command class + handler per write, one query class + handler per
   read.
10. **DTOs** — request DTOs (class-validator + `@ApiProperty`) + response class.
11. **Controller** — translate DTOs to commands/queries; never touch domain
    directly.
12. **Module** — `MikroOrmModule.forFeature([…])`, `CqrsModule`, provide
    `{ provide: <Entity>Repository, useClass: MikroOrm<Entity>Repository }`, list
    all handlers, register the controller, export the repository token.
13. **Wire** in `AppModule` and `mikro-orm.config.ts` (entities list).
14. **Migration** — under `src/shared/infrastructure/mikro-orm/migrations/`, and
    mirror the DDL in `test/integration/setup/jest-global-setup.ts`.
15. **OpenAPI** — `npm run openapi:generate` (CI fails on drift).
16. **Tests** — unit specs for invariants, mapper round-trip, validated wrapper;
    integration spec for the controller.

## Running locally (without Docker)

```bash
npm ci

# Start Postgres (or use your own)
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17-alpine
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

npm run migration:up
npm run start:dev           # serves :3000/api/v1, docs on :3000/docs
```

`cp .env.example .env` to see every knob the app reads.

## Testing

```bash
npm run test:unit           # fast, no Postgres
npm run test:e2e            # boots a Postgres testcontainer, runs migrations, exercises HTTP
npm test                    # both projects
```

The integration suite boots one Postgres container per Jest run (`globalSetup`)
and truncates between tests.

## Project conventions

- Variables: prefer `Id` over `ID` (e.g. `sellerId`, not `sellerID`).
- IDs: UUIDv7 (`uuid` ≥ 10) — sortable by creation time, drop-in for v4.
- Money: integer cents + currency via the `Money` value object, `bigint` in Postgres.
- Errors: throw subclasses of `DomainError`; `DomainExceptionFilter` maps them to
  HTTP status codes (`InvariantViolation` → 400, `NotFoundError` → 404,
  `ConflictError` → 409, unknown → 500).
- Defaults live in the domain (factories), not in the database.

## What's intentionally not in this template

Multi-tenant infrastructure, authn/authz, sagas/process managers, event
versioning, a message broker (the outbox publishes to the in-process `EventBus`;
swap the publisher to emit to Kafka/SNS/etc. when you need one). Add them when
your project needs them — opinionated foundations are easier to build on than to
peel back.
