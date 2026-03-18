# Supabase Migrations

`supabase/migrations/*.sql` is the canonical executable database source of truth.

## One-Time Bootstrap (existing hosted DB)

1. Install Docker Desktop and Supabase CLI.
2. Authenticate and link:
   - `pnpm supabase login`
   - `pnpm supabase link --project-ref <your-project-ref>`
3. Set DB password:
   - `export SUPABASE_DB_PASSWORD=<your-db-password>`
4. Create baseline migration from hosted DB:
   - `pnpm db:baseline:pull`
5. Regenerate schema snapshot docs:
   - `pnpm db:schema:snapshot`

## Day-to-Day

1. Create migration:
   - `pnpm db:new -- add_my_change`
2. Validate locally:
   - `pnpm db:start`
   - `pnpm db:reset`
   - `pnpm db:lint`
3. Preview hosted apply:
   - `pnpm db:push:dry-run`
4. Apply hosted migration:
   - `pnpm db:push`
   - Guardrail: this command now runs local preflight checks first (`supabase start`, `supabase db reset --local`, `supabase db lint --local`) before prompting for hosted apply.
5. Refresh schema snapshot docs:
   - `pnpm db:schema:snapshot`

Keep `schema/momo_snapshot.sql` as generated documentation only. Do not maintain manual per-table schema files.
