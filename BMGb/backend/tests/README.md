# Backend tests

Jest + Supertest API tests against a real PostgreSQL database. The concurrency tests depend on row locks, so an in-memory substitute would prove nothing.

## Running

```
npm run test:db:up     # disposable Postgres on 127.0.0.1:5433 (needs Docker)
npm test
npm run test:db:down
```

To use another Postgres, create an empty database whose name ends in `_test` and set any of `TEST_DB_NAME`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `TEST_DB_HOST`, `TEST_DB_PORT`.

## Safety

The suite drops and truncates tables, so `tests/setup/env.js`:

- reads connection settings only from `TEST_DB_*`, never from `DB_*` or `.env`
- refuses to run unless the database name ends in `_test` and the host is local

Stripe, S3, and email are replaced in `jest.config.js` through `moduleNameMapper`, so no test can reach them.

## Known bugs

Tests marked `it.failing` describe correct behaviour the code doesn't have yet. They pass while the bug exists and go red once it's fixed; at that point, change `it.failing` to `it`.
