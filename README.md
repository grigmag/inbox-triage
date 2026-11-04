# Inbox Triage

## Local development

Install dependencies and create the dashboard environment file:

```bash
pnpm install
cp apps/dashboard/.env.example apps/dashboard/.env
```

Ask the team for the remaining env vars and add them to `apps/dashboard/.env`.

Start Postgres, apply the committed migrations, and run the dashboard:

```bash
docker compose -p inbox-triage up -d
pnpm db:migrate
pnpm db:seed:settings
pnpm dev
```

## Database

### Configuration

Database commands load `DATABASE_URL` from `apps/dashboard/.env*`. If
`DATABASE_URL` is already set in the shell or CI environment, they use that
value instead.

### Schema changes

The schema and committed migrations live in `packages/db`. To make a change:

1. Edit the schema in `packages/db`.
2. Generate and review the migration:

```bash
pnpm db:generate
```

3. Check the generated migration history for conflicts:

```bash
pnpm db:check
```

4. Apply the migration manually:

```bash
pnpm db:migrate
```

### Settings defaults

After applying migrations, provision any missing company rate defaults with:

```bash
pnpm db:seed:settings
```

Run this operator command manually, one instance at a time. It preserves
existing settings and appends only missing defaults.

### Manually reverting a local migration

Drizzle does not provide automatic down migrations. Use this procedure only for
local development recovery when losing the affected data is acceptable. For a
migration applied to a shared environment, keep the existing migration and
create a new forward migration that restores the desired schema instead.

First, inspect the migration ledger and identify the exact migration to revert:

```bash
docker exec -it inbox-triage-postgres psql -U inbox-triage -d inbox-triage
```

```sql
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;
```

The hash can also be calculated from the exact migration file contents:

```bash
sha256sum packages/db/migrations/0001_example.sql
```

Reverse the migration's SQL in a transaction, then remove its matching ledger
entry. This generic example assumes the migration created `example_table`:

```sql
BEGIN;

DROP TABLE example_table;

DELETE FROM drizzle.__drizzle_migrations
WHERE created_at = 1234567890123
  AND hash = 'replace-with-the-migration-file-sha256';

COMMIT;
```

Replace the example table, timestamp, and hash with values from the migration
being reverted. Run the statements interactively, reverse every statement in
dependency-safe order, and execute the shown `COMMIT` only after the delete
reports `DELETE 1`; otherwise run `ROLLBACK` instead.
Deleting only the ledger entry does not revert the schema and can cause Drizzle
to rerun SQL against objects that still exist.

### Other commands

Open Drizzle Studio with:

```bash
pnpm db:studio
```
