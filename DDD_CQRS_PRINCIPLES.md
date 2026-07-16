# DDD & CQRS Principles

How the patterns in this template work, why they exist, and how to apply them to
your own business domain. Every section links the real files so you can read the
pattern next to its implementation.

The sibling Go template is
[`sklinkert/go-ddd`](https://github.com/sklinkert/go-ddd); this document mirrors
its guide with TypeScript/Nest.js specifics.

## Table of contents

1. [Layering](#layering)
2. [Aggregates and invariants](#aggregates-and-invariants)
3. [Value objects: Money](#value-objects-money)
4. [Branded IDs](#branded-ids)
5. [The ValidatedEntity wrapper](#the-validatedentity-wrapper)
6. [Repositories](#repositories)
7. [CQRS: one Unit of Work per command](#cqrs-one-unit-of-work-per-command)
8. [Domain events and the transactional outbox](#domain-events-and-the-transactional-outbox)
9. [Idempotent writes](#idempotent-writes)
10. [Error handling](#error-handling)
11. [Applying this to your domain](#applying-this-to-your-domain)

## Layering

```
domain  ←  application  ←  infrastructure / interface
```

Dependencies point inward, never outward:

- **`domain/`** is pure TypeScript. No Nest, no MikroORM, no class-validator. It
  defines aggregates, value objects, domain events, and _repository interfaces_.
  You can unit-test all of it without a container or database.
- **`application/`** orchestrates use cases: commands, queries, and their handlers.
  It calls repositories and mutates aggregates. It does not know about HTTP or SQL.
- **`infrastructure/`** implements what the domain declares: repository
  implementations, ORM entities, mappers, the outbox, idempotency storage.
- **`interface/`** is the delivery layer: controllers, DTOs, middleware, filters.

Why: the domain layer is where the business lives. Keeping frameworks out of it
means the most valuable code in the system is also the most portable and the
cheapest to test.

Rule of thumb: **defaults and invariants live in the domain**, not in the database
or the ORM. `Seller.create()` assigns the UUID and timestamps
([`src/modules/seller/domain/seller.ts`](src/modules/seller/domain/seller.ts));
the `currency` column default in the migration exists only to backfill old rows.

## Aggregates and invariants

An aggregate is a consistency boundary: a cluster of state that must be valid _as
a whole_ after every operation. This template ships two —
[`Seller`](src/modules/seller/domain/seller.ts) and
[`Product`](src/modules/product/domain/product.ts).

The shape every aggregate follows:

- **Private constructor.** Nobody can `new Product(...)` from outside.
- **`create(props)`** — the factory for _new_ aggregates. Assigns ID and
  timestamps, runs `validate()`, records a domain event.
- **`rehydrate(props)`** — the factory used by mappers when loading from the
  database. Runs `validate()` but records **no** event (nothing happened; we are
  just reading).
- **Behaviour methods** (`rename`, `changePrice`) mutate private fields, bump
  `updatedAt`, re-run `validate()`, and record an event. There are no public
  setters.
- **`validate()`** is private and throws `InvariantViolation` — an aggregate can
  never exist in memory in an invalid state.

Cross-aggregate references go **by ID** (`Product.sellerId: SellerId`), never by
object reference. Loading a product must not drag a seller (or its whole object
graph) with it, and updating a product must never accidentally flush changes to a
seller.

## Value objects: Money

A value object has no identity — two instances with the same contents are the same
value. [`Money`](src/shared/domain/money.ts) is the canonical example:

```ts
const price = Money.of(1299, 'USD'); // 12.99 USD
price.amountCents; // 1299
price.add(Money.of(1, 'EUR')); // throws: currency mismatch
```

Rules it encodes:

- **Integer minor units.** Never floats — `0.1 + 0.2 !== 0.3`, and rounding bugs in
  money are career-limiting. Postgres stores it as `bigint`.
- **Currency travels with the amount.** An amount without a currency is a bug
  waiting to happen; arithmetic across currencies throws.
- **Immutable and self-validating.** `Money.of()` rejects non-integers, zero and
  negative amounts, and malformed currency codes. Once constructed, a `Money` is
  always valid — so `Product.validate()` doesn't need to re-check price rules.

When you find yourself validating the same primitive in several places (an email,
a percentage, a quantity), that primitive wants to be a value object.

## Branded IDs

TypeScript's structural typing means a plain `string` seller ID is assignable to a
plain `string` product ID. [`branded-id.ts`](src/shared/domain/branded-id.ts) fixes
this with a phantom brand:

```ts
export type SellerId = Brand<Uuid, 'SellerId'>;
const id: SellerId = SellerId('0190...'); // validates the UUID at the boundary
```

Passing a `ProductId` where a `SellerId` is expected is now a compile error. IDs
are UUIDv7 — time-sortable, index-friendly, generated in the domain (not by the
database).

## The ValidatedEntity wrapper

The least intuitive pattern in the template, and the most important one.
Repositories accept only validated wrappers for writes:

```ts
abstract save(p: ValidatedProduct): Promise<Product>;
```

[`ValidatedProduct`](src/modules/product/domain/validated-product.ts) has a private
constructor and a static `__unsafeWrap(entity, guard)` that checks a
module-private `Symbol`. The only code path that can produce one is
`product.toValidated()`, which re-runs `validate()` first.

The effect: **"you cannot persist an unvalidated entity" is enforced by the
compiler**, not by convention or code review. TypeScript checks private
constructors nominally, so there is no way to fake a `ValidatedProduct` from
outside the module. This is the TS equivalent of go-ddd's `ValidatedProduct`
struct embedding.

## Repositories

The interface lives in the domain as an abstract class
([`product.repository.ts`](src/modules/product/domain/product.repository.ts)) —
abstract classes double as Nest DI tokens, so no separate injection token is
needed. The implementation
([`mikro-orm-product.repository.ts`](src/modules/product/infrastructure/persistence/mikro-orm-product.repository.ts))
is the only code that touches the ORM.

Mappers ([`product.mapper.ts`](src/modules/product/infrastructure/persistence/product.mapper.ts))
translate between the ORM entity and the aggregate — `toDomain` uses
`rehydrate()`, `toOrm` reads the aggregate's getters. No business logic lives in
either direction.

## CQRS: one Unit of Work per command

Writes and reads are separate paths (`@nestjs/cqrs`):

- **Commands** (`CreateProductCommand` → [`create-product.handler.ts`](src/modules/product/application/commands/create-product.handler.ts))
  mutate exactly one aggregate and run inside `em.transactional(...)` — one
  command, one transaction, one Unit of Work.
- **Queries** (`GetProductQuery`, `ListProductsQuery`) are read-only and can bypass
  the aggregate entirely if a projection is cheaper.

Controllers translate DTOs into commands/queries and results into responses;
they never touch the domain directly. Handlers never publish events directly
either — see the outbox.

## Domain events and the transactional outbox

The problem: "save the product AND tell the world about it" is two systems (your
database, your bus). If you write to the database and then publish, a crash
in between loses the event; publish first and the write may fail after the
world already heard about it.

The fix — persist the event **in the same transaction** as the state change:

1. Aggregates record events internally (`AggregateRoot.recordEvent`).
2. The repository's `save()` pulls them (`pullDomainEvents()`) and writes them to
   the `outbox` table via [`outbox.recorder.ts`](src/shared/infrastructure/outbox/outbox.recorder.ts)
   inside the business transaction. Either both the product row and its
   `ProductCreated` event commit, or neither does.
3. [`OutboxPublisher`](src/shared/infrastructure/outbox/outbox.publisher.ts) polls
   every second with `SELECT … FOR UPDATE SKIP LOCKED`, publishes through Nest's
   `EventBus`, and stamps `published_at`. `SKIP LOCKED` makes multiple app
   instances safe — they never grab the same row.

Delivery is **at-least-once**: a crash after publishing but before stamping means
the event is re-published. Subscribers must be idempotent.

## Idempotent writes

Clients retry. Networks duplicate. The
[`IdempotencyMiddleware`](src/shared/interface/middleware/idempotency.middleware.ts)
makes `POST`/`PUT`/`PATCH` retry-safe, Stripe-style:

- The client sends an `Idempotency-Key` header. Scope is `(key, method, path)` —
  the same key on a different endpoint is a different request.
- **Claim before work.** [`IdempotencyService.claim()`](src/shared/infrastructure/idempotency/idempotency.service.ts)
  atomically inserts a _pending_ row. The winner proceeds; a concurrent duplicate
  gets `409` + `Retry-After` while the first is in flight — there is no
  check-then-insert race.
- **Replay on completion.** A retry with the same key and body hash gets the
  cached response, byte for byte. Same key, different body → `409 Conflict`.
- **Crash takeover.** A pending claim older than `IDEMPOTENCY_PENDING_TTL_MS`
  (default 5 min) is treated as abandoned — its holder crashed mid-request — and is
  taken over atomically by the next retry instead of 409ing forever.
- Only `2xx` responses are cached; failures release the claim so the client can
  retry cleanly.

## Error handling

The domain throws typed errors
([`src/shared/domain/errors.ts`](src/shared/domain/errors.ts));
[`DomainExceptionFilter`](src/shared/interface/filters/domain-exception.filter.ts)
maps them to HTTP at the boundary:

| Domain error         | HTTP |
| -------------------- | ---- |
| `InvariantViolation` | 400  |
| `NotFoundError`      | 404  |
| `ConflictError`      | 409  |
| anything else        | 500  |

The domain never knows HTTP status codes exist; controllers never `try/catch`
domain errors. One filter, one error shape (`{ code, message }`).

## Applying this to your domain

The `Seller`/`Product` marketplace is a teaching example. To model your own
domain, follow the step-by-step recipe in the
[README's "How to add a new aggregate"](README.md#how-to-add-a-new-aggregate).
The short version of the design questions:

1. **Find the consistency boundaries.** What must be true _immediately_ after
   every write? That's an aggregate. What can be true _eventually_? That's a
   domain event another aggregate reacts to.
2. **Keep aggregates small.** If two things can be updated independently without
   breaking each other's rules, they are two aggregates referencing each other by
   ID.
3. **Push primitives into value objects** the moment they carry rules
   (Money, Email, Quantity, DateRange).
4. **One command = one aggregate = one transaction.** If a use case seems to need
   two aggregates in one transaction, either the boundary is wrong or you need a
   domain event (and eventual consistency) between them.
