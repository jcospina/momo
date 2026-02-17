# MoMo Data-Layer Decoupling Plan

## Goal
Keep the presentation layer fully agnostic to where data comes from. If Supabase is replaced tomorrow, only the data layer changes; UI and feature logic stay intact.

## Guardrails
- No UI/UX changes.
- No forced change to server vs client component structure (data access can be functions or hooks).
- Supabase stays as the current adapter until replaced.

## Architecture (Current vs Desired)
**Current state**
```
UI/Components ─┐
              ├─▶ Feature Hooks ─▶ Server Actions / API Routes ─▶ Supabase
              └─▶ Realtime Hooks ───────────────────────────────▶ Supabase
```

**Desired state**
```
UI/Components ─▶ Feature Hooks ─▶ Data Interfaces ─▶ Adapters
                                              ├─▶ Supabase Adapter (web)
                                              ├─▶ Future Adapter (new backend)
                                              └─▶ Mock Adapter (tests)
```

## Starter Audit (UI folder)
- **Mostly decoupled**: UI components are prop-driven + CSS.
- **Data-source neutral**: no Supabase in UI.
- **Non-data coupling still exists** (not part of this plan): `src/ui/link/link.tsx`, `src/ui/button/button.tsx` use `next/link`.

## Target Data Interfaces
Define small, feature-focused contracts:
- `AuthClient`: login, logout, session
- `OnboardingClient`: onboarding state + updates
- `ProfileClient`: profile + preferences
- `HouseholdClient`: membership + invites
- `ExpensesClient`: create/update expenses, details
- `StatsClient`: chart-ready aggregates
- `ChatClient`: send/delete/history/sync + realtime subscribe

## Data Interface Shape (expanded)
### Design principles
- **Small, stable, and explicit**: avoid “god” interfaces.
- **Return data in view-ready shapes** to minimize UI refactors.
- **No transport concerns** in UI (no Supabase, no HTTP).
- **Typed errors** to keep UI logic deterministic.

### Common result type
Use a shared result shape for all data calls:
```
type DataResult<T, TError extends string> =
  | { ok: true; data: T }
  | { ok: false; error: TError; message?: string };
```

### Example interface definitions (shape only)
```
type AuthClient = {
  login(input: { email: string; password: string }): Promise<DataResult<{ userId: string }, 'auth_failed'>>;
  logout(): Promise<DataResult<null, 'auth_failed'>>;
  session(): Promise<DataResult<{ userId: string | null }, 'session_failed'>>;
};

type ProfileClient = {
  getProfile(): Promise<DataResult<Profile, 'profile_not_found' | 'auth_required'>>;
  updateProfile(input: ProfileUpdate): Promise<DataResult<Profile, 'profile_update_failed'>>;
  updatePreferences(input: PreferencesUpdate): Promise<DataResult<Preferences, 'prefs_update_failed'>>;
};

type StatsClient = {
  getMonthlyTotals(input: { scope: 'personal' | 'household' }): Promise<DataResult<MonthlyTotals, 'stats_failed'>>;
  getMonthlyCategoryTotals(input: { scope: 'personal' | 'household' }): Promise<DataResult<CategoryTotals, 'stats_failed'>>;
  getDailyComparison(input: { month: string; scope: 'personal' | 'household' }): Promise<DataResult<DailyComparison, 'stats_failed'>>;
};

type ChatClient = {
  sendMessage(input: { content: string; scope: 'personal' | 'household' }): Promise<DataResult<ChatMessage, 'send_failed'>>;
  deleteMessage(input: { messageId: string }): Promise<DataResult<{ messageId: string }, 'delete_failed'>>;
  fetchHistory(input: { scope: 'personal' | 'household'; cursor?: ChatCursor }): Promise<DataResult<ChatMessage[], 'history_failed'>>;
  sync(input: { scope: 'personal' | 'household'; cursor?: ChatCursor }): Promise<DataResult<ChatMessage[], 'sync_failed'>>;
  subscribe(input: {
    scope: 'personal' | 'household';
    onMessage: (message: ChatMessage) => void;
    onDelete?: (message: ChatMessage) => void;
    onStatus?: (status: string) => void;
  }): { unsubscribe: () => void };
};
```

### Intended usage (UI/feature hooks)
- UI calls `useDataClient().chat.sendMessage(...)`.
- Hooks encapsulate the call and return view-state.
- Server components can call interfaces directly (adapter is still injected).

## Regression Prevention
### Contract tests
- Each adapter must pass a common test suite (same inputs/outputs).
- Use a mock adapter in tests to validate UI logic without IO.

### Typed error codes
- Errors are strings, shared in a single enum/type file.
- UI handles only known codes; unknown codes fail tests.

### Snapshot parity (optional)
- For each view model, store sample input/output fixtures.
- When adapters change, run fixtures to ensure output shape stability.

### Adapter isolation
- No direct imports of Supabase or HTTP clients outside adapters.
- CI check can enforce this (simple `rg` for forbidden imports).

## Phased Plan (easy → hard)

### Phase 0 — Inventory + Data Boundary (easy)
**Goal:** identify every data touchpoint and define interface owners.
- Map each server action, API route, and Supabase client call to one interface.
- Introduce `DataProvider` (context) that exposes all interfaces.

**Deliverables**
- `src/data/interfaces/*` (types only).
- `src/data/provider.tsx` with `useDataClient()`.
- Inventory table in this doc (see checklist below).

### Phase 1 — Auth / Register / Onboarding (easy)
**Goal:** remove direct Supabase calls from auth/onboarding flows.
- Create `AuthClient` + `OnboardingClient` adapters that wrap existing actions.
- UI/feature hooks call interfaces only.

**Targets**
- `src/lib/actions/login.ts`
- `src/lib/actions/logout.ts`
- `src/lib/actions/households.ts`
- `src/lib/actions/invites.ts`
- `src/lib/actions/user-prefs.ts`
- Pages/components calling these actions

### Phase 2 — Profile (easy‑medium)
**Goal:** profile screens use interface calls only.
- Implement `ProfileClient`.
- `ProfileProvider` loads profile from interface (server still allowed).

**Targets**
- `src/providers/profile-provider.tsx`
- Profile page + preference components

### Phase 3 — Stats (medium)
**Goal:** stats data comes from `StatsClient`, not actions.
- Move data shaping into pure helpers.
- `StatsClient` returns chart-ready data (same shape as today).

**Targets**
- `src/lib/actions/expense-stats.ts`
- `src/components/stats/*`

### Phase 4 — Chat (hard)
**Goal:** chat uses `ChatClient` only.
- Replace server action calls with interface calls.
- Replace Supabase realtime with adapter-managed `subscribe` API.

**Targets**
- `src/components/chat/*`
- `src/features/chat/hooks/*`
- `src/hooks/use-realtime-client.ts`
- `src/app/api/chat-history`, `src/app/api/chat-sync`

### Phase 5 — Consolidation (hard)
**Goal:** all data access lives under adapters.
- UI/feature layers contain zero Supabase imports.
- Only adapters know transport details (Supabase/REST/etc).

## Component Checklist (by area)
### Auth / Onboarding
- `src/lib/actions/login.ts`
- `src/lib/actions/logout.ts`
- `src/lib/actions/households.ts`
- `src/lib/actions/invites.ts`
- `src/lib/actions/user-prefs.ts`

### Profile
- `src/providers/profile-provider.tsx`

### Stats
- `src/lib/actions/expense-stats.ts`
- `src/components/stats/*`

### Chat
- `src/lib/actions/chat-messages.ts`
- `src/features/chat/hooks/*`
- `src/hooks/use-realtime-client.ts`
- `src/app/api/chat-history`, `src/app/api/chat-sync`

## Verification (per phase)
- UI unchanged (visual snapshots).
- Type/lint clean.
- Functional parity: auth, onboarding, profile, stats, chat + realtime.
- Adapter swap test: change adapter implementation without touching UI.

## Notes
- Server components may call data interfaces directly.
- Client components may call data interfaces through hooks.
- The contract shapes should mirror current data usage to avoid refactors.
