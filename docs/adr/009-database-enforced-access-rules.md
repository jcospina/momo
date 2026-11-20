---
version: 1.0
last_updated: 2026-11-19
---

# ADR-009: Database-enforced access rules for joins, MoMo replies and admin flags

## Context

A security review of the RLS policies found several rules that were enforced
only by app code, even though users can call PostgREST directly with their own
session:

- `members_insert` only checked `user_id = auth.uid()`. The invite token was
  checked in the auth callback, so anyone who knew a household UUID could add
  themselves to it, with any role.
- `enforce_household_capacity` ran as the joining user. RLS hid the existing
  members, so the count was always 0 and the 5-member limit never fired for
  client inserts.
- `user_prefs.ai_enabled` is an admin-managed flag, but users could set it.
- MoMo replies were inserted with the user's session, so any user could insert
  or edit rows with `author_kind = 'momo'`.
- Household expenses could be attributed to another member or linked to another
  user's chat message.
- `user_profiles.email` was user-writable and unique, so a user could spoof the
  email shown to their household or claim someone else's email before signup.
- `get_user_label` and `is_member_definer_uid` answered for any user UUID, and
  `anon` could execute every function and had full table grants.

## Decision

Migration `20261119140000_security_hardening.sql` moves these rules into the
database:

- **Joining a household** goes through `join_household_with_invite(p_token)`,
  a `SECURITY DEFINER` function that resolves the household from the token and
  always inserts `role = 'member'`. Direct inserts into `household_members` are
  only allowed for a user adding themselves as owner of a household they own
  (the household creation flow). `role` must be `owner` or `member`.
- **Membership triggers** (`enforce_household_capacity`,
  `prevent_multiple_households`) run as `SECURITY DEFINER` so they see every
  member row and the `FOR UPDATE` lock takes effect.
- **`ai_enabled`** is guarded by `trg_user_prefs_guard_ai_enabled`: API roles
  (`anon`, `authenticated`) always insert `false` and cannot change it. The
  service role and database owners can. The unused `setAiEnabled` action and UI
  were removed.
- **MoMo replies** are written by the server with the service role
  (`persistMomoReply`), after the caller's own session confirms the triggering
  message is theirs and in the same chat. RLS rejects user writes with
  `author_kind = 'momo'`, a `momo_source` or an `idempotency_key`, and users
  cannot update MoMo rows.
- **Expenses** must be attributed to the caller and can only link to the
  caller's own chat messages. Write policies also re-check household membership.
- **Category rules** can be updated by any member of the rule's household (this
  also fixes `upsert_category_rule` failing when another member created the
  rule).
- **`user_profiles.email`** is copied from `auth.users` by
  `trg_user_profiles_email` on every insert and update.
- **`get_user_label`** only returns labels for the caller and people in the
  caller's household; **`is_member_definer_uid`** only answers for
  `u = auth.uid()`.
- **Grants**: `anon` has no table or function access in `public`. Function
  `EXECUTE` is revoked from `PUBLIC` and granted to `authenticated` and
  `service_role`; `get_share_link_info` stays service-role only. Default
  privileges no longer grant anything to `anon`.

## Consequences

- The service-role key is now used for two server-only paths: invite lookups
  and MoMo reply persistence. `sendMomo` in `src/lib/data/messages/server.ts`
  is deliberately not a server action, so clients cannot reach it.
- New functions still get `EXECUTE` for `PUBLIC` from Postgres' global default.
  Every migration that adds a function must `REVOKE ... FROM PUBLIC` and grant
  only the roles that need it.
- Existing rows were not rewritten. Profile emails that users changed before
  this migration stay as they are until the row is next updated, and the role
  check constraint is `NOT VALID` for legacy rows.
- Updates that move a row into a household the caller does not belong to were
  already blocked: on an `UPDATE` with a `WHERE` clause, Postgres also checks
  the new row against the `SELECT` policy. The new `WITH CHECK` clauses make
  that rule explicit.
- `sender_name` and `display_name` remain user-controlled display text; they
  are not identity.
