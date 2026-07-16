## What & why

<!-- What does this change, and what problem does it solve? -->

## How to test

<!-- Commands or steps a reviewer can run to verify. -->

## Checklist

- [ ] `npm test` passes (integration tests need Docker)
- [ ] `npm run lint` and `npm run format:check` pass
- [ ] Schema changes include a migration AND the test schema in `test/integration/setup/jest-global-setup.ts`
- [ ] API changes regenerate `api/openapi.yaml` (`npm run openapi:generate`)
- [ ] New behavior is covered by tests
