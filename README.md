# ts-ddd

Opinionated Nest.js / TypeScript Domain-Driven Design template, modelled on
[`sklinkert/go-ddd`](https://github.com/sklinkert/go-ddd).

It ships two example aggregates — `Seller` and `Product` (a Product references a Seller
by ID) — wired through every layer plus three production-grade patterns:
**ValidatedEntity wrapper**, **transactional outbox**, and **idempotent writes**.

## Stack

| Concern        | Choice                                                                 |
|----------------|------------------------------------------------------------------------|
| HTTP           | `@nestjs/core` + Express, REST under `/api/v1`                         |
| Application    | `@nestjs/cqrs` (CommandBus / QueryBus / EventBus)                      |
| Persistence    | `@mikro-orm/postgresql` (Data Mapper + Unit of Work)                   |
| Migrations     | `@mikro-orm/migrations`                                                |
| Scheduling     | `@nestjs/schedule` (used by the outbox publisher)                      |
| IDs            | UUIDv7 via `uuid`                                                      |
| Validation     | `class-validator` on HTTP DTOs only; domain uses plain TS guards        |
| Testing        | Jest unit tests + `@testcontainers/postgresql` integration tests       |

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
    domain/          # AggregateRoot, DomainEvent, branded IDs, DomainError
    infrastructure/  # outbox, idempotency, MikroORM migrations
    interface/       # global filter, idempotency middleware
  main.ts
  app.module.ts
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
- Hit with matching hash → cached response is replayed.
- Hit with different hash → `409 Conflict`.
- Miss → request proceeds; on `2xx` response, the result is recorded
  `ON CONFLICT DO NOTHING` so concurrent retries don't collide.

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
10. **DTOs** — request DTOs (class-validator decorators) + response shape.
11. **Controller** — translate DTOs to commands/queries; never touch domain
    directly.
12. **Module** — `MikroOrmModule.forFeature([…])`, `CqrsModule`, provide
    `{ provide: <Entity>Repository, useClass: MikroOrm<Entity>Repository }`, list
    all handlers, register the controller, export the repository token.
13. **Wire** in `AppModule` and `mikro-orm.config.ts` (entities list).
14. **Migration** — generate or hand-write under
    `src/shared/infrastructure/mikro-orm/migrations/`.
15. **Tests** — unit specs for invariants, mapper round-trip, validated wrapper;
    integration spec for the controller.

## Running locally

```bash
pnpm install                # or npm/yarn

# Start Postgres (or use your own)
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

pnpm migration:up
pnpm start:dev              # serves :3000/api/v1
```

### Smoke test
```bash
curl -X POST localhost:3000/api/v1/sellers \
  -H 'content-type: application/json' \
  -d '{"name":"Acme","email":"acme@example.com"}'
# → 201 { id: "<uuid>", … }

curl -X POST localhost:3000/api/v1/products \
  -H 'content-type: application/json' \
  -H 'Idempotency-Key: 11111111-1111-7111-8111-111111111111' \
  -d '{"sellerId":"<uuid>","name":"Widget","priceCents":1299}'
# Repeating the exact same request returns the same response, creates no extra row.

psql "$DATABASE_URL" -c 'select count(*) from products;'           # 1
psql "$DATABASE_URL" -c 'select id, published_at from outbox;'     # published within ~1s
```

## Testing

```bash
pnpm test:unit              # fast, no Postgres
pnpm test:e2e               # boots a Postgres testcontainer, runs migrations, exercises HTTP
pnpm test                   # both projects
```

The integration suite boots one Postgres container per Jest run (`globalSetup`)
and truncates between tests.

## Project conventions

- Variables: prefer `Id` over `ID` (e.g. `sellerId`, not `sellerID`).
- Logging: `nestjs/common` `Logger` — wire `pino` if you need structured output.
- IDs: UUIDv7 (`uuid` ≥ 10) — sortable by creation time, drop-in for v4.
- Errors: throw subclasses of `DomainError`; `DomainExceptionFilter` maps them to
  HTTP status codes (`InvariantViolation` → 400, `NotFoundError` → 404,
  `ConflictError` → 409, unknown → 500).

## What's intentionally not in this template

Swagger, Docker Compose, GitHub Actions, multi-tenant infrastructure, a logger
preset, sagas/process managers, event versioning. Add them when your project needs
them — opinionated foundations are easier to build on than to peel back.
