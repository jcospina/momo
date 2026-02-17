# ADR-004: DB-Enforced Household Constraints

**Status:** Accepted
**Date:** 2026-02-17

## Context

Households have two key constraints:

1. A user can belong to at most one household.
2. A household can have at most 5 members.

These could be enforced at the application level (check before insert) or at the database level (triggers + unique index).

## Decision

Both constraints are enforced at the database level:

- **One household per user:** `one_household_per_user` unique index on `household_members.user_id` + `trg_one_household` trigger calling `prevent_multiple_households()`.
- **Max 5 members:** `trg_household_capacity` trigger calling `enforce_household_capacity()` with a `FOR UPDATE` row lock on the household.

The trigger approach provides defense-in-depth alongside the unique index (which handles the single-household constraint atomically).

## Consequences

**Benefits:**

- Race-condition proof — the `FOR UPDATE` lock in `enforce_household_capacity` prevents concurrent inserts from exceeding the cap.
- Cannot be bypassed — any code path that inserts into `household_members` (app code, migrations, admin scripts) is subject to these rules.
- Single source of truth — the constraint definition lives in one place.

**Trade-offs:**

- Harder to provide user-friendly error messages — the app catches Postgres exceptions (`user_has_a_household`, `household_full`) and maps them to UI messages. This is less ergonomic than a pre-check, but the pre-check would be a TOCTOU race without the DB constraint anyway.
- Trigger logic is less visible than application code — developers need to know the triggers exist when debugging insert failures.
- The `FOR UPDATE` lock adds a small serialization point for concurrent joins, but household joins are rare events so this is negligible.
