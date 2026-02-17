# Auth and Households

## Authentication

MoMo uses Google OAuth via Supabase Auth. There is no email/password flow.

1. User clicks "Sign in with Google"
2. Supabase handles the OAuth redirect and callback
3. On successful auth, a session is established server-side
4. The app checks `user_prefs.onboarding_status` to route the user

## Onboarding

The `onboarding_status` field in `user_prefs` tracks where the user is in setup:

- **`unknown`** — New user, hasn't completed onboarding. Redirected to onboarding flow.
- **`completed`** — Finished onboarding (set preferences, optionally created/joined household).
- **`skipped`** — User skipped onboarding. Can still set up later.

On first login, a `user_profiles` row is created with an auto-generated `invite_token` (via the `ensure_invite_token` trigger) and a `user_prefs` row with status `unknown`.

## Household Model

A household is a group that shares expenses. Key constraints:

- **One household per user** — Enforced by the `one_household_per_user` unique index on `household_members.user_id` plus the `trg_one_household` trigger.
- **Max 5 members** — Enforced by the `trg_household_capacity` trigger with a row-level lock to prevent race conditions.
- **Owner is also a member** — The household creator is inserted into `household_members` with `role = 'owner'`.

Users can exist without a household (personal-only mode). Both personal and household scopes are available in the chat and stats interfaces.

## Invite Flow

Household owners can invite others via a share link:

1. **Generate link** — The owner shares a URL containing their `invite_token` from `user_profiles`. The invite CTA is only shown to household owners when the household is not full.

2. **Validate invite** — The invitee visits `/invite/[token]`. The page calls `get_share_link_info(token)` RPC which returns:
   - `household_valid` — Household exists and has room
   - `household_full` — Household has 5 members
   - `no_household` — Inviter has no household

3. **Auth + join** — If valid, the invitee authenticates via Google. The auth callback reads the invite token from a cookie and inserts the new member into `household_members`.

4. **Constraint enforcement** — The `trg_one_household` trigger prevents users who already belong to a household from joining another. The `trg_household_capacity` trigger prevents the household from exceeding 5 members.

### Error States

| Status | User sees |
| ------------------- | -------------------------------------------- |
| `household_valid` | Household name, inviter name, member count, and join button |
| `household_full` | Message that the household is full |
| `no_household` | Message that the invite link is invalid |
| User already in a household | Error after attempting to join |
