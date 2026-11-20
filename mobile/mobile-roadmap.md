# MoMo mobile: incremental delivery roadmap

2026-09-25 · Status: proposed, implementation not started

Reviewed for release dependencies and consistency with the research on 2026-09-25. No roadmap release has been implemented or verified at runtime yet.

## 1. Delivery objective

Deliver a useful React Native app quickly while continuing to release a working MoMo web app. Each migration step should be independently reviewable, deployable, and recoverable. Mobile development must not wait for complete UI conversion or a new backend architecture.

This is the implementation sequence for the approach discussed after the [initial research](momo-mobile.md). It supersedes that document's original sequencing and default of separate web/native primitives. The research remains the reference for existing behavior, file-level findings, Supabase details, and risks.

The chosen delivery direction is:

- Keep Next.js as the web application and initial API host. Defer an independent backend deployment.
- Keep one Supabase schema and project per environment, shared by web and mobile.
- Add Expo/React Native in the same pnpm workspace.
- Build reusable UI using React Native-compatible primitives and render those components on web through React Native Web, subject to an early compatibility proof.
- Keep working web components alongside their replacements until each migrated caller has passed verification.
- Extract domain logic and server services only as a mobile slice needs them.
- Use private workspace packages. Public npm publishing is unnecessary for this roadmap.

“Fastest” means minimizing work before a complete mobile expense flow. “Safest” means preserving financial behavior, access control, web availability, and compatibility with already distributed apps. A reuse percentage is not a release target.

## 2. What is shared, and what stays platform-specific

| Share progressively | Keep platform-specific initially |
| --- | --- |
| Theme values, spacing, typography, borders and visual variants | Navigation, deep-link handling, browser links and native back behavior |
| Button, Panel, Text and Input implementations where the proof succeeds | Browser form/server-action bindings, DOM refs and native keyboard adapters |
| Expense rules, money formatting, records and API contracts | Supabase cookie sessions on web and device session storage on mobile |
| Stateless feature components built from shared primitives | Chat scrolling/virtualization, chart renderer and modal presentation |
| Chat ordering/reconciliation and selected hooks | Foreground/connectivity listeners and lifecycle wiring |
| Server-side expense processing, category learning and AI orchestration | Next.js redirects/revalidation and HTTP response handling |

React Native Web renders compatible React Native components through React DOM and supports incremental adoption in existing web applications. This enables shared implementations after an initial port; it does not convert existing HTML/CSS Modules automatically. [React Native Web documentation](https://necolas.github.io/react-native-web/docs/).

Small platform-specific implementations remain an acceptable escape hatch. Do not force a single component to hide incompatible browser/native behavior. [React Native platform-specific code](https://reactnative.dev/docs/platform-specific-code).

## 3. Release map

All entries are **planned**. “Web release” means a separately deployable increment; it does not imply that deploying to production has been authorized or performed by this document.

| Release | Web increment | Mobile increment | Exit evidence |
| --- | --- | --- | --- |
| R0 — Baseline | Effective architecture checks and a repeatable critical-flow check | None | Current behavior and test/build results recorded |
| R1 — Workspace | Same web app deployed from `apps/web` | Workspace location reserved | Production-mode preview works from the new directory |
| R2 — Shared UI proof | Isolated preview of shared primitives | Expo development build with the same primitives | Button, Panel, Text and Input work in browser/iOS/Android |
| R3 — First UI adoption | Small profile presentation section uses shared primitives | Same component in native preview | A real web caller migrated with a reversible selection |
| R4a — Service extraction | Existing send path uses extracted services | Portable contracts ready | Existing web behavior unchanged |
| R4b — Mobile API | Additive authenticated bootstrap/onboarding/chat endpoints | API client ready | Cookie and bearer paths pass equivalent fixtures |
| R5 — First complete mobile slice | Web remains compatible with the new client | Sign in, send a personal expense, see processed result and live updates | Real phone and web show the same persisted outcome |
| R6 — Recovery and safe retries | Shared reliability improvements released separately | Resume/reconnect and uncertain-send recovery | No duplicate expenses; missed changes reconciled |
| R7 — Expense editing | Shared edit fields and the same edit/delete services | View/edit expenses, delete own messages and learn categories | Both clients produce matching financial results |
| R8 — Household and preferences | Shared services and selective UI adoption | Household chat, create/join, settings | Membership/concurrency/isolation tests and two-device flow |
| R9a — Stats | Shared transformations and contracts | Native stats screens | Matching totals, windows and currency behavior |
| R9b — AI | Reused and hardened streaming service | Native `@momo` streaming | Auth, preference, trigger and persistence checks |
| R10 — Release readiness | Compatibility and operational checks | Distributable release build | Declared release scope and rollout/rollback gates pass |

R2→R3 is the UI path. R4a→R4b is the backend path. After R1 they can progress independently; first native delivery needs the R2 proof and R4b API, but does not need a broad web UI migration. R3 should stay small enough to release early without becoming a prerequisite for every mobile screen.

The minimum dependency chain is R0 → R1 → (R2 and R4a → R4b) → R5 → R6. R3 follows R2 independently. R7 uses the R5 app and must satisfy R6 before wider distribution. R8 and R9 can be built as separate feature increments after the core flow; household variants of stats/AI require the R8 scope and membership behavior. R10 applies at each external distribution milestone, not only after all features are complete.

Useful milestones:

- **M1, after R5:** an internal development build proves the entire personal-expense flow on controlled test accounts.
- **M2, after R6/R7 plus applicable R10 gates:** a possible focused personal-tracking beta. This is a proposed scope, not a decision to exclude households from the public product.
- **M3, after R8/R9 plus R10:** broader mobile parity with the currently supported product.

No calendar estimates are assigned yet. Estimate the remaining slices after R2 and R5 expose actual UI, native-auth and lifecycle costs. A release is a coherent change, not a requirement to combine all its work into one large PR.

## 4. Rules that apply to every release

### Keep each change understandable

Separate directory movement, behavior-preserving extraction, UI adoption, API introduction, and database behavior changes. Do not combine a parser change with its package move, or replace the chat UI while changing persistence.

For existing business workflows, use this order: characterize behavior → introduce the shared implementation → adopt it behind the existing web facade → deploy and verify → connect mobile → remove obsolete code after the rollback window. UI follows the R2 cross-platform proof, then small web adoptions; an unrelated web screen migration must not block mobile from using a proven shared primitive.

Web does not need to switch from server actions to HTTP just because mobile uses HTTP. Both transports can call the same service. Adding an extra web network hop is not a reuse requirement.

### Keep the existing boundaries

UI and providers access data through each app's `src/lib/data/*` facades. Shared UI stays presentational. Server services never import mobile code, UI, or web cookie/redirect APIs. Shared client packages never export server services or credentials. Preserve facade payloads and optional `errorCode`; adapt new internal signatures behind existing web exports.

### Release record

Before shipping an increment, record:

| Field | Required content |
| --- | --- |
| Scope | Feature, route, operations and callers changed |
| Evidence | Targeted checks, production-mode preview and relevant browser/device flows |
| Compatibility | Previous web behavior, current mobile build and schema assumptions |
| Rollout | Preview → controlled exposure where appropriate → general availability |
| Rollback | Exact component selection, deployment or compatibility action |
| Owner | Person responsible for observing and deciding whether to proceed |
| Cleanup | Old implementation/flag and the condition for removing it |

Choose observation coverage based on traffic and the operation's risk. Do not invent a fixed percentage or waiting period with no baseline. Release completion requires exercising the affected workflows, checking relevant error signals, and recording the outcome. Low traffic makes an absence of errors insufficient evidence by itself.

### Stop conditions

Pause expansion and recover the affected release if it causes an auth loop, cross-account/household access, lost or duplicate financial records, inconsistent totals, broken primary input, or unresolved hydration/navigation regressions. Performance thresholds should be set from the R0 baseline before the affected release, not invented afterward.

## 5. R0 — Establish a useful baseline

**Web change:** tighten verification, with no intended product behavior change.

Record current results for `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm exec jest --runInBand`, and `pnpm build`. Identify pre-existing failures instead of silently accepting them as migration failures or broadening into unrelated cleanup. Avoid remote AI/provider spending in these checks.

The checked-in [CI workflow](../.github/workflows/db-migrations-check.yml) gates its work on migration changes. Add app/package checks that run for relevant source/config changes, including non-SQL PRs. Keep local database checks for changes that affect schema or access control.

Repair the [boundary checker's](../scripts/check-data-boundaries.mjs) missing-config/missing-source behavior before moving directories. It currently derives roots from the working directory and can receive an empty migrated-scope list. Verify a known forbidden import is detected; a passing check that scanned nothing is not a gate.

Capture a short baseline for login, onboarding/skip, personal and household send, edit/category learning, delete, history, stats, preferences, sign-out, and AI-disabled behavior. Reuse existing tests and add characterization only where a migration-sensitive behavior is not covered.

Record the existing mobile-width and desktop appearance for the primitives and first migrated route, using test data. Keep the distinction between personal chat and personal stats, COP amount handling, and timestamp/ID ordering explicit.

**Gate:** useful checks run on a non-migration PR, current failures are accounted for, critical behavior is reproducible.

**Rollback:** revert verification/tooling changes if broken; no data migration is involved.

The full suite/build is appropriate for R0, R1 and changes to shared configuration/dependencies or core cross-client behavior. For later isolated UI changes, start with affected component/contract tests and browser/device checks, then broaden according to risk. Do not turn every cosmetic leaf migration into a full native release cycle.

## 6. R1 — Move to workspaces without changing the product

**Web change:** the same application runs from `apps/web`.

Move the Next app/configuration in a mechanical change. Retain `supabase/`, shared DB scripts, repository hooks, documentation and the lockfile at root. Add `apps/*` and `packages/*` to the pnpm workspace definition; retain the current dependency build allowlist. Update TS/Jest paths, locale loading, scripts, environment examples, and source roots. Do not include unrelated uncommitted design/product files in the move.

Keep the same web routes, callback URLs, origin, session behavior and backend endpoints. Narrow the web TypeScript project so it will not compile native code once mobile is added. Keep DB startup separate from app/package startup. Update AGENTS.md path guidance and boundary enforcement together.

Validate the hosting root/build configuration in a preview, including workspace dependencies in the final server artifact. Pin package-manager and compatible runtime versions. Defer package proliferation: a workspace does not require every planned package to exist immediately.

Expo supports pnpm workspaces and provides automatic monorepo configuration through its Metro integration. Start from that support rather than copying legacy resolver overrides. [Expo monorepo documentation](https://docs.expo.dev/guides/monorepos/).

**Gate:** clean install, checks, web production build and preview smoke flows pass from the new layout. Confirm architecture checks still inspect real files.

**Rollback:** revert the move and restore the matching deployment root/build configuration together. Keep a known-good deployment available. No schema change.

## 7. R2 — Prove shared UI before choosing a full UI migration

**Web change:** a non-public preview/gallery of shared primitives. **Mobile change:** an Expo development build showing the exact same component exports.

Create only the initial `@momo/tokens` and `@momo/ui` packages. Port Button, Panel, Text/Typography and Input using React Native-compatible primitives. Resolve theme values into native-supported colors while preserving the existing web appearance. Keep Sunbeam and Paper & Ink identities and the existing spacing/typography scale.

Keep semantic props such as `variant`, `disabled`, `multiline`, `prefix`, and `suffix` where they make sense. Do not export browser event objects, `className`, arbitrary HTML `as` values, or DOM refs as the universal contract. Web wrappers can retain old signatures. A Next.js link-button or `<form action>` binding needs a web adapter; it must not lose link semantics, Enter-to-submit behavior, or server-action submission during migration.

Verify React Native Web resolution, stylesheet inclusion, SSR/hydration, client entrypoints, theme initialization and production bundling in the actual pinned Next configuration. Do not turn whole pages into client components merely to consume one shared primitive. Confirm React resolves correctly in both app graphs and that server dependencies do not enter the native bundle.

The proof must cover both palettes, ordinary/disabled/focused/pressed states, narrow and wide layouts, keyboard navigation on web, native text entry, multiline sizing, labels, font scaling, and a basic screen-reader pass. Specifically compare MoMo's borders and offset shadows rather than assuming CSS has an identical native interpretation.

**Decision gate:**

- If the shared components preserve behavior and appearance without broad web changes, proceed with this implementation.
- If one primitive has a platform-specific constraint, add a narrow platform adapter and keep sharing the rest.
- If the approach forces a widespread web rewrite or unresolved runtime regressions, document the evidence and keep web's current implementation for that component. Continue mobile through a native implementation using shared tokens; do not block the entire product on perfect reuse.

Do not introduce Tamagui, Solito or another UI/navigation layer automatically. Add one only for a demonstrated requirement from this proof. No new library is assumed necessary for the initial primitives.

**Gate:** the same package works in a production-mode Next preview and iOS/Android development builds; findings and any exceptions are recorded.

**Rollback:** remove the preview integration. Existing production UI is untouched.

## 8. R3 — Ship the first small shared UI section on web

**Web change:** adopt shared presentation in the profile summary/header within `/home/profile`. Keep its data loading, membership logic, settings controls and logout form unchanged.

Start with the name/summary surface and typography from the [current profile page](../src/app/home/profile/page.tsx). Keep platform-specific wrappers around legacy children where necessary. Do not replace the global Panel export and thereby change every route at once.

Use an explicit local wrapper/component selection so this one section can return to the legacy view. A small existing configuration mechanism is sufficient; do not build a feature-flag service for the migration. Test the complete profile page, including the unchanged controls, for layout/focus regressions caused by the new section.

Once this release is stable, adopt additional leaf components in separately verified increments. Shared Button/Input have already been exercised in R2; their first production form migration should include an actual submission/focus/accessibility check, not just screenshots.

**Mobile change:** render the shared profile summary with fixtures. No need to wait for profile API coverage to verify presentation reuse.

**Gate:** both themes, mobile/desktop widths, direct navigation and hydration pass; surrounding forms and links still work.

**Rollback:** select the old profile section. Avoid dual rendering or hidden duplicate form controls.

## 9. R4a/R4b — Reuse the backend through an additive API

### R4a: extract behavior and keep the web transport

Extract only contracts/domain functions needed by the first native slice and the send-processing use case. Keep the parser authoritative on the server. It need not be bundled into mobile merely because it lives in a shared package.

Create `@momo/contracts`, `@momo/domain`, and `@momo/server` as actual consumers justify them. Keep legacy type/function exports as compatibility re-exports. Generate shared database types when introducing typed adapters. Do not extract every stats helper, hook or agent module now.

Inject authenticated user/client context through the entire send call graph: preferences, learned rules, parsing, persistence, status update and final fetch. Preserve ordinary message statuses and AI-enabled mention bypass. Keep cookie auth, redirects, translated form errors and revalidation in the web layer.

**Web release gate:** existing web sends, failure outcomes and money/category fixtures pass through the new service. No API or schema behavior change is needed in the same commit.

### R4b: add the first bearer-token endpoints

Add only bootstrap, onboarding skip, history, sync and send operations under a versioned API. Route handlers call server data facades; mobile providers/components call mobile data facades. Keep existing web actions/routes intact. Backend HTTP handlers are a supported Next capability; choosing their host here is a delivery decision, not a commitment to keep all backend concerns in Next forever. [Next.js backend guidance](https://nextjs.org/docs/app/guides/backend-for-frontend).

Bootstrap ensures the application profile and returns preferences/membership without assuming OAuth itself creates application records. API auth validates the bearer token and supplies the same scoped identity to every nested helper. Do not accept a supplied `userId` as authorization. Preserve the caller's RLS context.

The first endpoint set must include an authenticated way to persist `onboarding_status: 'skipped'`, for example `POST /api/v1/onboarding/skip`. Reuse the existing preference mutation without its Next redirect. Bootstrap must not silently mark onboarding complete or skipped. This small operation is needed by R5; it cannot wait for the broader R8 preferences API. Password/OAuth authentication itself remains direct Supabase Auth rather than a new credential-proxy endpoint.

Validate bodies/cursors/limits and define HTTP-to-facade errors. Compare the existing cookie path with the new bearer path using the same fixtures. Include unauthenticated, expired-token, personal/household isolation, malformed-input and AI-disabled cases.

Before exposing these endpoints to real users, test the specific policy findings in the research. Fix demonstrated access-control defects in separate compatible migrations with negative tests. An official API does not prevent direct Supabase Data API access, so server-only checks are not sufficient evidence of DB protection. Any use of a privileged operation must be narrow, explicitly authorized and tested; do not switch all requests to service-role access.

**Gate:** equivalent web/API results and authorization tests pass; the old web transport continues to work. A new endpoint is not enabled for real users with an unresolved applicable access-control defect.

**Rollback:** R4a can revert before mobile depends on it. After R4b is consumed, retain the API contract and roll back its implementation compatibly; do not delete the endpoint as part of a web rollback.

## 10. R5 — Complete the first mobile expense flow

**Mobile increment:** password/Google login, session restore, bootstrap, personal chat history, compose/send, processed status, and active Realtime updates. Use shared primitives from R2; keep native navigation and list behavior local.

Use the same environment's Supabase Auth and Realtime. Mobile owns its session and sends its access token to Next API calls. Keep secret keys and demo credentials off the device. Ensure the app can reach both API and Supabase endpoints during local/staging development.

Handle OAuth callback success/cancel, cold launch and duplicate delivery. Handle signup requiring confirmation. Preserve the existing onboarding rules, including personal-only users who explicitly skipped onboarding. Implement the necessary skip/bootstrap path rather than leaving new users stuck or guessing their onboarding state. Existing household membership should be represented accurately even though this internal milestone exercises personal chat only.

Share reconciliation rules as needed, but keep browser scroll code and native list geometry separate. Retain ordering by timestamp/ID and reconcile response/Realtime races. Refresh the active loaded window when returning to the app so the basic slice does not assume events were delivered during suspension.

Do not enable automatic send retries yet. If a request outcome is ambiguous, show a pending/uncertain result, preserve the draft as appropriate, and sync to look for the persisted outcome. Absence from a limited history page is not proof that the write failed: keep unresolved operations uncertain rather than offering a blind resend. R6 supplies operation-ID-based resolution and safe replay. The internal milestone uses controlled test accounts while robust recovery is completed.

Handle unfinished capabilities explicitly. Before R9b, if the account has AI enabled and the draft would invoke `@momo`, explain that this build does not support invocation and retain the draft instead of submitting a tagged trigger with no reply path. If AI is disabled, preserve the existing ordinary-parser behavior. Do not turn off the user's shared AI preference to simplify mobile. Likewise, clearly label unavailable household/edit/stats actions in internal builds rather than showing working-looking controls. Existing assistant messages still need a safe read-only display; their presence in history does not require the streaming endpoint.

**Web increment:** any small compatibility corrections required by the second client are released separately; there is no full chat UI replacement.

**Gate:** a new user can sign in, explicitly skip onboarding, send an expense from a real phone, and verify the authoritative persisted result in web. Send from web and observe it on the phone, restart/sign out/sign in without leaking account state, exercise both auth methods, and verify AI-enabled accounts do not silently create unsupported invocations. No raw mobile insert may bypass expense processing.

**Rollback:** withdraw the internal build/disable the affected entry flow and keep the additive API backward compatible. Web remains usable.

## 11. R6 — Make recovery and retries safe before wider use

Release backend reliability and database changes independently from native UI adoption. This phase is a prerequisite for externally distributed builds that allow repeated/automatic mutation attempts.

Add an optional client operation ID for sends, preserve it across retries, and enforce uniqueness for the authenticated user/operation. Define behavior for conflicting payloads and partially completed processing. A unique message row does not prove that expense creation is idempotent; persist/recover processing progress or make the affected writes transactional. Preserve old web callers while progressively adopting operation IDs there too.

Resolve unknown outcomes through sync or operation lookup. Do not repeat a model invocation merely because a foreground event fired. Keep first-release offline scope to draft retention, explicit connection state and recovery; a durable offline outbox is separate work.

On resume/reconnect, refresh auth, restore the active subscription and catch up without parallel duplicate sync runs. Creation cursors alone miss old edits/deletions. Refresh a complete, defined active history interval and reconcile removals only when absence is authoritative. Invalidate/revalidate older cached pages when revisited. Handle large backlogs beyond the current page cap, lost responses and pending status recovery.

Normalize delete events as removal/invalidation by ID; do not assume they contain complete message rows. Cancel old work on logout/account change and prevent delayed events from repopulating another user's cache.

**Gate:** response lost after processing, repeat submit, long suspension, airplane mode, expired token, missed update/delete, large backlog and account switch all have verified outcomes. The same retry cannot create a duplicate expense.

**Rollback:** disable retry adoption or the affected UI flow while retaining compatible operation-ID behavior for builds already using it. Leave additive schema in place; do not undo recorded user operations.

## 12. R7 — Share the expense editor in small steps

First expose existing expense detail/update and own-message deletion services through the API. Preserve amount validation, COP behavior, note handling, category-rule learning, message-status synchronization and the current message/expense deletion behavior. Resolve partial-write/retry behavior explicitly; do not assume a service extraction makes updates transactional.

On web, migrate the edit form's leaf fields/buttons to shared implementations behind the existing dialog. Keep the surrounding modal/focus implementation until a separate change is justified. On mobile, use the same fields, validation and view logic inside a native presentation.

Share field composition only where it remains clear. Keep web `FormData`/form event conversion and native keyboard/submit handling in adapters. Characterize the existing category-learning side effects; changing fire-and-forget work into awaited/durable work is a separate reliability change with its own gate.

**Gate:** edit amount/date/category/note from each client and observe the same result on the other; verify invalid amounts, cancellation, focus, keyboard behavior, category learning and status changes. Verify own-message deletion and its linked-expense outcome, rejection of another user's delete, and reconciliation on the other client. Test both locale catalogs and supported currencies.

**Rollback:** restore legacy web form rendering without reverting the stable edit API. Disable a mobile edit flow if needed while retaining read/send access.

At this point, consider a limited personal-tracking beta only if its scope is explicitly agreed and the applicable R10 gates are complete. Full web UI conversion is not required.

## 13. R8 — Add household flows and preferences

Split this into independently deployable services and UI increments: preferences; household reads/chat; household creation; invite preview/accept. Reuse the existing DB model, capacity rules and one-household-per-user constraint.

Add native household switching/subscriptions, owner/member display and invitation handling. Persist a pending invite across sign-in, revalidate it when accepting, and clear it after terminal handling. Test invalid/full/already-joined cases, supplied roles, and concurrent join/create attempts. Fix applicable policy defects before widening access. Define atomicity or recovery for multi-step household creation.

Keep current public invite URLs working for web users and people without the app. Add app-link handling deliberately; do not silently redirect all invite traffic into a native-only path. Preserve the web OAuth callback and locale-cookie behavior while mobile applies locale locally.

Adopt shared settings/household presentation in web one section at a time. Keep provider, navigation, share-sheet and dialog differences explicit. AI preferences remain off unless explicitly enabled, regardless of whether the setting is visible in a particular UI.

**Gate:** two authenticated users on web/native can join and share the correct household timeline; unrelated users cannot access it; switching scopes/accounts leaves no stale subscriptions or data. Preference changes survive restart and render correctly.

**Rollback:** keep auth/API/database compatibility and restore affected presentation. Do not remove membership records or relax authorization to recover a release.

## 14. R9a/R9b — Add stats and AI without widening the migration

### R9a: stats

Extract the transformations and contracts needed by the first native stats view. Web adopts those packages while keeping its Visx renderer. Mobile receives the same authoritative datasets and renders them with a native renderer. Do not make replacing web charts a prerequisite.

Preserve personal stats including the current user's household expenses, income exclusions/inclusions by metric, empty months, category labels and date windows. Keep heavy aggregation on the server initially. Test totals against identical fixtures rather than accepting visually similar charts.

**Gate:** datasets and displayed values agree for personal/household cases and currencies; chart interaction and native accessibility are verified. **Rollback:** restore web transformations/renderer compatibly; keep the stats API consumed by released builds.

### R9b: AI

Move only the necessary orchestration behind the authenticated service. Retain the current plain-text stream, AI preference check and persisted-assistant reconciliation. Validate trigger ownership/scope/eligibility before invoking the model. Keep prompts/credentials/executors and tracing server-side.

Use streaming-capable native transport and test split UTF-8 chunks, cancellation, HTTP failure, interrupted stream, backgrounding and Realtime arriving before stream completion. Assistant-row uniqueness does not prevent duplicate provider calls. Preserve the known interrupted-stream persistence limitation unless a separate durable-job design is approved.

**Gate:** deterministic mocked-stream tests and device transport checks pass; real provider validation is separately controlled, and there are no automatic duplicate invocations. **Rollback:** disable new AI entry UI where necessary while retaining authorization and API compatibility for existing clients.

## 15. R10 — Distribution and release operations

Apply these gates to the first external beta as well as the broader public release; they are not postponed merely because their section appears last.

| Gate | Required evidence |
| --- | --- |
| Declared scope | Clear supported workflows and known omissions for the build; no implied parity with unfinished features |
| Session security | Tested secure persistence, refresh, restore, sign-out, large-session/storage failure and account switching |
| Access control | Applicable DB/API negative tests pass with real user roles, not service-role shortcuts |
| Artifact hygiene | No privileged credentials, server runtime, eval fixtures or private environment files in mobile artifacts |
| Release build | Installable iOS/Android builds tested beyond development mode, including auth callback/app links |
| Native UX | Keyboard, back navigation, safe areas, long timelines, accessibility, larger text and slow/offline states |
| Compatibility | Previous distributed app build works against the next backend release; current web flows still pass |
| Operations | Redacted auth/send/processing/sync/stream errors observable and tied to app/API version; an owner can diagnose failures |
| Rollback | Rehearsed UI/feature rollback that retains API/schema compatibility and user data |
| Platform readiness | Required store authentication, privacy, account lifecycle and distribution requirements reviewed for the actual release scope |

The exact supported-version policy is set before external distribution. At minimum, keep the last distributed beta/release build working through the next backend deployment. An npm package version, wire API version and database migration are separate compatibility concerns.

Deploy compatible additive schema first, then services/API, then clients. For policy changes, verify both old web adapters and new API callers before rollout; “compatible” must not mean retaining a known authorization defect. Prefer a forward fix or disabling the affected operation when security and rollback conflict.

Once mobile depends on an endpoint, rolling the entire Next deployment back to a pre-API build is unsafe. Keep a known-good deployment containing the mobile contract, or roll back the web change while preserving compatible endpoints. Do not assume an app-store rollback instantly replaces installed binaries.

## 16. Package and migration scope controls

Use this as a creation trigger, not a mandate to scaffold everything:

| Package | Create when | Keep out |
| --- | --- | --- |
| `@momo/tokens` | R2 needs shared visual values | DOM application and device storage |
| `@momo/ui` | R2 has real shared primitives | Data fetching, routing policy, secrets |
| `@momo/contracts` | R4 requires portable operations | `FormData`, Supabase channels, web action signatures |
| `@momo/domain` | R4 needs records/rules used by extracted services | Cookie/session factories and IO |
| `@momo/server` | R4a extracts authenticated use cases | Next redirects, web UI, mobile dependencies |
| Database types | Typed transport needs a shared generated schema | Credentials and runtime initialization |
| Client transport package | Reusable transport logic warrants it | UI/provider state and server code |
| Shared hooks/catalog packages | A specific slice has a second consumer | Speculative abstractions and browser-only effects |

Use explicit exports and real workspace dependencies. Verify build outputs and declarations from a clean consumer when creating a package; prevent app aliases from leaking into emitted imports. Keep React as a peer of shared UI/hooks. Use narrow platform exports/wrappers where necessary and test that Metro/Next resolve the intended implementation.

Keep new UI adoption explicit per caller. Do not point the legacy `@ui/*` alias wholesale at the new package. Track each migrated component/feature, its web/native consumers, platform exceptions and removal condition. Measure successful reuse through these consumers, not a promised 90% target.

Retire an old implementation only when its caller inventory is empty, its replacement has passed the release gate, and the agreed rollback window has closed. Keep a single source of truth for shared tokens/rules while adapters coexist; do not maintain two diverging copies of business logic. Any temporary duplicate presentation has an owner and a removal condition in the release record. Before R1 is complete, update documentation links that move with `src/` so the roadmap/research remain usable after the directory relocation.

## 17. What does not block the first mobile release

- A dedicated `apps/api` deployment or backend framework migration.
- Moving to Supabase Edge Functions.
- Public npm publication, independent package release tooling, or a large monorepo task framework.
- Converting every web primitive, marketing/legal page, chart, dialog or screen to React Native Web.
- A unified navigation abstraction across Next.js and Expo.
- A durable offline outbox, push notifications or receipt capture unless added to the release scope.
- Extracting every React hook before the first working native flow.

Safe auth, data isolation, compatible contracts and reliable financial outcomes are not deferred architecture work. They are required for the slices that exercise them.

## 18. First execution batch

Begin with R0, then the R1 mechanical move. Build the R2 primitive proof before committing to widespread UI conversion. In parallel as a development workstream, extract the R4 send service and API so R5 can validate a real phone-to-web expense flow early. This describes independent work dependencies, not a requirement to use multiple agents.

The first reviewable outputs should be: the baseline/check fixes; a deployable workspace move; a shared primitive gallery in web and native; one small web profile adoption; and an authenticated mobile send path backed by the same service as web.

This roadmap changes documentation only. It does not create tickets, install dependencies, implement a migration, modify production configuration, or ship a release.
