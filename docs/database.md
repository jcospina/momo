---
version: 1.0
last_updated: 2026-05-08
---

# Database

This document explains the design rationale behind the database schema.

- Canonical executable SQL: `supabase/migrations/*.sql`
- Human-readable snapshot docs: `schema/momo_snapshot.sql` (generated, do not edit manually)

## Migration Workflow

### Single Environment Caveat

MoMo currently uses one hosted Supabase project for all branches. Branch names do not isolate database changes: any hosted migration apply impacts production data immediately.

### Setup (One-Time)

1. Install Docker Desktop and Supabase CLI.
2. Authenticate and link the repository to your project:
   - `pnpm supabase login`
   - `pnpm supabase link --project-ref <your-project-ref>`
3. Export database password locally:
   - `export SUPABASE_DB_PASSWORD=<your-db-password>`
4. Create baseline migration from your current hosted schema:
   - `pnpm db:baseline:pull`
   - When prompted about updating migration history on remote, answer `Y`.
5. Generate/update schema snapshot docs:
   - `pnpm db:schema:snapshot`

### Day-to-Day Commands

- Create a migration: `pnpm db:new -- <migration_name>`
- Start local Supabase: `pnpm db:start`
- Validate full replay locally: `pnpm db:reset`
- Reset + seed local dev fixture data: `pnpm db:seed`
- Lint SQL locally: `pnpm db:lint`
- Preview hosted apply: `pnpm db:push:dry-run`
- Apply hosted migrations (guarded, `development` branch only): `pnpm db:push`
- Refresh snapshot docs: `pnpm db:schema:snapshot`

`schema/` should contain only `momo_snapshot.sql`. Do not add per-table/manual SQL files there.

### Local Seed Workflow

- Keep `db:reset` clean and deterministic (migrations only).
- Keep production credentials in `.env`; use `.env.local` for local overrides.
- `pnpm dev` uses `.env.local` overrides; `pnpm dev:app` runs against `.env` by temporarily disabling `.env.local`.
- Use `db:seed` when you need preloaded users/household/preferences for local UI testing.
- `db:seed` resets first, then seeds.
- `db:seed` expects seed users to already exist in `auth.users` (recommended for Google-only auth). Set `MOMO_DEV_SEED_CREATE_MISSING_USERS=true` only if you intentionally want email/password bootstrap users.
- `db:seed` has a safety check and will fail when pointed to non-local Supabase URLs.

### Rollback / Recovery Runbook

1. Take a hosted backup before risky changes:
   - `pnpm supabase db dump --linked --schema public -f backups/db/pre_migration_$(date +%Y%m%d%H%M%S).sql`
2. If a migration fails and migration history state is incorrect:
   - Inspect migration state with `pnpm supabase migration list --linked`.
   - Repair history with `pnpm supabase migration repair --status reverted <migration_version>`.
3. Prefer forward-fix migrations over editing already-applied migration files.

## Tables

### `households`

Represents a group (family, roommates, etc.) that shares expenses. Each household has an owner (the creator). The owner is also a member via `household_members`.

### `household_members`

Join table linking users to households. Composite primary key `(household_id, user_id)`. The `one_household_per_user` unique index on `user_id` enforces that each user belongs to at most one household. The `role` field distinguishes owners from members.

### `user_profiles`

Stores display name, username, email, and an `invite_token` used for the household invite flow. The invite token is auto-generated on insert via the `ensure_invite_token` trigger and is immutable after creation.

### `user_prefs`

User preferences: onboarding status, currency, language, and AI toggle. The `onboarding_status` field uses a check constraint (`unknown`, `completed`, `skipped`) rather than an enum to keep it simple.

### `chat_messages`

Messages sent in the chat interface. Each message can be personal (`household_id = NULL`) or household-scoped. The `status` enum tracks processing state: `pending` → `processed` / `needs_category` / `no_expense` / `failed`. The `sender_name` field is denormalized for display efficiency in realtime broadcasts.

### `expenses`

Individual expense entries. Linked to a chat message via `chat_message_id` (nullable — future direct-entry support). `amount_cents` is always positive (enforced by check constraint). COP stores whole units; EUR/USD store minor units (cents). Income is represented with `category = 'income'`; expense views exclude it unless they are cashflow-specific. Tags are stored as a `text[]` array, cleaned by the `clean_expense_tags` trigger.

### `category_rules`

Learned category overrides keyed by normalized entry text. Personal rules are unique by `(user_id, normalized_text)` where `household_id IS NULL`; household rules are unique by `(household_id, normalized_text)` where `household_id IS NOT NULL`. They are written after successful categorized expense edits and read during chat processing after deterministic parsing.

## RLS Strategy

All tables have Row Level Security enabled. The strategy uses two membership check functions:

- **`is_member(h)` / `is_member_uid(h, u)`** — `SECURITY INVOKER` functions. Used in RLS policies where the calling context already has access to `household_members`. These run as the calling user and respect RLS on the tables they query.

- **`is_member_definer(h)` / `is_member_definer_uid(h, u)`** — `SECURITY DEFINER` functions. Used in RLS policies on tables like `chat_messages` where the SELECT policy on `household_members` would create circular RLS checks. These bypass RLS to perform the membership lookup. See [ADR-005](adr/005-security-definer-membership-functions.md) for the rationale.

**Policy patterns:**

- Personal data (profiles, prefs): `user_id = auth.uid()`
- Household data (expenses, messages): `is_member_uid(household_id, auth.uid())` OR personal fallback `(household_id IS NULL AND user_id = auth.uid())`
- Learned category rules: personal rules by `user_id` and null `household_id`, household rules by `is_member_definer_uid(household_id, auth.uid())`
- Cross-table lookups (chat select): `is_member_definer_uid(household_id, auth.uid())`

## Triggers

### Household Constraints

- **`trg_one_household`** — `BEFORE INSERT` on `household_members`. Calls `prevent_multiple_households()` to raise an exception if the user already belongs to a household. Works alongside the `one_household_per_user` unique index for defense-in-depth.
- **`trg_household_capacity`** — `BEFORE INSERT` on `household_members`. Calls `enforce_household_capacity()` with a `FOR UPDATE` lock on the household row to prevent race conditions. Raises `household_full` if count >= 5.

See [ADR-004](adr/004-db-enforced-household-constraints.md) for why these are DB-level rather than app-level.

### Data Integrity

- **`trg_user_profiles_token`** — Auto-generates `invite_token` on insert, prevents modification on update.
- **`trg_expenses_clean_tags`** — Normalizes tags on insert/update: lowercases, trims, deduplicates, validates format (`^[a-z0-9_]{1,32}$`), removes empties.

## Views

Views handle stats aggregation, all with `security_invoker = true` so they respect the caller's RLS context:

| View | Purpose |
| ------ | --------- |
| `monthly_by_category` | Expense totals per category per month, excluding `income` |
| `monthly_totals` | Expense totals per month, excluding `income` |
| `monthly_totals_by_user` | Household expense totals per user per month, excluding `income` and using `get_user_label` |
| `monthly_by_category_user` | Household expense totals per category per user per month, excluding `income` |
| `daily_totals_by_month` | Daily expense totals + cumulative running total per month, excluding `income` |
| `monthly_cashflow_income` | Monthly totals for `income` entries |
| `monthly_cashflow_expense` | Monthly totals for non-income expense entries |
| `monthly_cashflow_net` | Monthly income, expense, and net totals |

The household-only views use `is_member_definer_uid` to perform membership checks within the view query.

## Helper Functions

- **`get_user_label(user_id)`** — Returns `display_name` or falls back to `email`. `SECURITY DEFINER` so it can read `user_profiles` regardless of calling context.
- **`get_share_link_info(token)`** — Used by the invite flow. Looks up the inviter by token, returns household info and status (`no_household`, `household_full`, `household_valid`). `SECURITY DEFINER` to allow unauthenticated invite page lookups.
- **`get_household_member_profiles(household_id)`** — Returns member roles and display info. Uses `is_member_definer_uid` to verify the caller is a member.
- **`upsert_category_rule(user_id, household_id, normalized_text, category)`** — Upserts personal or household learned category rules. Runs as `SECURITY INVOKER` and is constrained by `category_rules` RLS.

## Indexes

| Index | Table | Purpose |
| ------- | ------- | --------- |
| `idx_chat_messages_household_created` | `chat_messages` | Fast lookup by household + time |
| `idx_chat_messages_user_created` | `chat_messages` | Fast lookup by user + time |
| `idx_chat_messages_status_pending` | `chat_messages` | Partial index for pending messages |
| `idx_expenses_tags_gin` | `expenses` | GIN index for tag array queries |
| `idx_expenses_household_category_expense_date` | `expenses` | Household stats/cashflow lookup by category and date |
| `idx_expenses_personal_user_category_expense_date` | `expenses` | Personal stats/cashflow lookup by user, category, and date |
| `idx_category_rules_personal_text` | `category_rules` | Unique personal learned-rule lookup |
| `idx_category_rules_household_text` | `category_rules` | Unique household learned-rule lookup |
| `one_household_per_user` | `household_members` | Unique constraint on `user_id` |
