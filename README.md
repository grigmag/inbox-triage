# InboxTriage

## Local development

Create the dashboard environment file and start Postgres:

```bash
cp apps/dashboard/.env.example apps/dashboard/.env
docker compose -p inbox-triage up -d
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

### Other commands

Open Drizzle Studio with:

```bash
pnpm db:studio
```
