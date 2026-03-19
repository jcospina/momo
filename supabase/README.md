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
   - ensure `.env.local` points to local Supabase (`http://127.0.0.1:54321` + local keys)
   - `pnpm db:reset`
   - Optional dev bootstrap data: `pnpm db:seed`
   - `pnpm db:lint`
3. Preview hosted apply:
   - `pnpm db:push:dry-run`
4. Apply hosted migration:
   - `pnpm db:push`
   - Guardrail: this command now runs local preflight checks first (`supabase start`, `supabase db reset --local`, `supabase db lint --local`) before prompting for hosted apply.
5. Refresh schema snapshot docs:
   - `pnpm db:schema:snapshot`

Keep `schema/momo_snapshot.sql` as generated documentation only. Do not maintain manual per-table schema files.

## Dev Seed Data

- `pnpm db:reset` -> always fresh DB (migrations only).
- `pnpm db:seed` -> always resets first, then applies deterministic seed data.

The seed command creates:

- matching `user_profiles` and `user_prefs` (`onboarding_status = completed`) for 2 auth users
- one household and memberships

Safety guardrail: it refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` points to `localhost`/`127.0.0.1`.

Google OAuth note: app login remains Google-only.

- Default behavior: seed expects auth users to already exist (by email), which is ideal when those users signed in via Google.
- If missing users should be auto-created (email/password bootstrap), set `MOMO_DEV_SEED_CREATE_MISSING_USERS=true`.
- Local Supabase Google provider is enabled via env vars:
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`
  Define them in `.env` before `pnpm db:start`.
- Configure your Google OAuth app callback URL as `http://127.0.0.1:54321/auth/v1/callback`.

Optional seed env vars:

- `MOMO_DEV_SEED_OWNER_EMAIL` / `MOMO_DEV_SEED_MEMBER_EMAIL` (which auth users to use)
- `MOMO_DEV_SEED_OWNER_NAME` / `MOMO_DEV_SEED_MEMBER_NAME` (display names for `user_profiles`)
- `MOMO_DEV_SEED_HOUSEHOLD_NAME`
- `MOMO_DEV_SEED_CREATE_MISSING_USERS=true` (off by default)
- `MOMO_DEV_SEED_OWNER_PASSWORD`, `MOMO_DEV_SEED_MEMBER_PASSWORD`, or `MOMO_DEV_SEED_PASSWORD` (only relevant when create-missing-users is enabled)
