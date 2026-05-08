---
version: 1.0
last_updated: 2026-02-17
---

# ADR-005: SECURITY DEFINER Membership Functions

## Context

RLS policies on tables like `chat_messages` and `expenses` need to check whether the current user is a member of a household. This check queries `household_members`. However, `household_members` itself has RLS policies, creating a potential circular dependency: to read a chat message, you need to check membership, but checking membership requires reading `household_members`, which requires its own RLS check.

## Decision

Two variants of the membership check function exist:

- **`is_member(h)` / `is_member_uid(h, u)`** — `SECURITY INVOKER`. Runs as the calling user. Used in RLS policies where the calling context already has read access to `household_members` (e.g., the `households` table's SELECT policy).

- **`is_member_definer(h)` / `is_member_definer_uid(h, u)`** — `SECURITY DEFINER`. Runs as the function owner (superuser context), bypassing RLS on `household_members`. Used in RLS policies on `chat_messages` and views where an invoker-mode check would cause circular RLS evaluation.

## Consequences

**Benefits:**

- Breaks the circular RLS dependency cleanly.
- The `SECURITY DEFINER` functions are minimal (single `EXISTS` query) reducing the surface area of the privilege escalation.
- Both variants have the same interface, making it clear at the policy definition site which mode is in use.

**Trade-offs:**

- `SECURITY DEFINER` functions bypass RLS, so they must be carefully scoped. Any bug in these functions could leak membership information.
- Developers must choose the correct variant when writing new policies — using the wrong one could either break queries (invoker where definer is needed) or unnecessarily escalate privileges (definer where invoker suffices).
- The `_uid` variants accept an explicit user ID rather than relying on `auth.uid()`, which is needed for views and functions that run in a different auth context.
