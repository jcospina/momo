# Database

This document explains the design rationale behind the database schema. For the actual SQL DDL, see the `schema/` directory.

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

Individual expense entries. Linked to a chat message via `chat_message_id` (nullable — future direct-entry support). `amount_cents` is always positive (enforced by check constraint). COP stores whole units; EUR/USD store minor units (cents). Tags are stored as a `text[]` array, cleaned by the `clean_expense_tags` trigger.

## RLS Strategy

All tables have Row Level Security enabled. The strategy uses two membership check functions:

- **`is_member(h)` / `is_member_uid(h, u)`** — `SECURITY INVOKER` functions. Used in RLS policies where the calling context already has access to `household_members`. These run as the calling user and respect RLS on the tables they query.

- **`is_member_definer(h)` / `is_member_definer_uid(h, u)`** — `SECURITY DEFINER` functions. Used in RLS policies on tables like `chat_messages` where the SELECT policy on `household_members` would create circular RLS checks. These bypass RLS to perform the membership lookup. See [ADR-005](adr/005-security-definer-membership-functions.md) for the rationale.

**Policy patterns:**

- Personal data (profiles, prefs): `user_id = auth.uid()`
- Household data (expenses, messages): `is_member_uid(household_id, auth.uid())` OR personal fallback `(household_id IS NULL AND user_id = auth.uid())`
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
| `monthly_by_category` | Total cents per category per month (personal + household) |
| `monthly_totals` | Total cents per month (personal + household) |
| `monthly_totals_by_user` | Total cents per user per month (household only, uses `get_user_label`) |
| `monthly_by_category_user` | Total cents per category per user per month (household only) |
| `daily_totals_by_month` | Daily totals + cumulative running total per month |

The household-only views use `is_member_definer_uid` to perform membership checks within the view query.

## Helper Functions

- **`get_user_label(user_id)`** — Returns `display_name` or falls back to `email`. `SECURITY DEFINER` so it can read `user_profiles` regardless of calling context.
- **`get_share_link_info(token)`** — Used by the invite flow. Looks up the inviter by token, returns household info and status (`no_household`, `household_full`, `household_valid`). `SECURITY DEFINER` to allow unauthenticated invite page lookups.
- **`get_household_member_profiles(household_id)`** — Returns member roles and display info. Uses `is_member_definer_uid` to verify the caller is a member.

## Indexes

| Index | Table | Purpose |
| ------- | ------- | --------- |
| `idx_chat_messages_household_created` | `chat_messages` | Fast lookup by household + time |
| `idx_chat_messages_user_created` | `chat_messages` | Fast lookup by user + time |
| `idx_chat_messages_status_pending` | `chat_messages` | Partial index for pending messages |
| `idx_expenses_tags_gin` | `expenses` | GIN index for tag array queries |
| `one_household_per_user` | `household_members` | Unique constraint on `user_id` |
