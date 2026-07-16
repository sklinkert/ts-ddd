# Contributing

Thanks for wanting to improve `ts-ddd`! This is an opinionated template, so the bar
for adding things is "does this teach a production pattern?" rather than "is this
useful in some project?".

## Setup

```bash
npm ci
docker compose up -d postgres      # or bring your own Postgres
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/ts_ddd
npm run migration:up
npm run start:dev
```

## Tests

```bash
npm run test:unit     # fast, no Docker
npm run test:e2e      # boots a Postgres testcontainer (needs Docker)
npm test              # both
```

## Before opening a PR

- `npm run lint` and `npm run format:check` pass.
- Schema changes come with a migration under
  `src/shared/infrastructure/mikro-orm/migrations/` **and** the mirrored DDL in
  `test/integration/setup/jest-global-setup.ts`.
- API changes regenerate the spec: `npm run openapi:generate` (CI fails on drift).
- New behavior has tests. Domain logic gets unit tests; anything touching HTTP or
  the database gets an integration test.

## PR guidelines

Keep PRs small and focused. Explain the intent (what problem does this solve, why
this way) in the description — reviewers should not have to reverse-engineer it
from the diff.

## Questions

Use the "Pattern question" issue template if something about the DDD/CQRS patterns
is unclear — those questions often turn into documentation improvements.
