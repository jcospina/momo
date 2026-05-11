---
version: 1.0
last_updated: 2026-04-23
---

# Research: Encryption Options for Sensitive Expense and Chat Data

Date: 2026-04-15  
Scope: `chat_messages`, `expenses`, and `category_rules` privacy hardening in Supabase/Postgres without breaking current users or UX.

## Executive Summary

Your current setup already has strong user-to-user isolation with RLS, but it does **not** prevent privileged database operators (project admins, service roles, superusers) from reading raw sensitive content.

If your hard requirement is: _"even platform/database admins cannot read user content"_ then only **client-side end-to-end encryption (E2EE)** truly satisfies it.

If your practical requirement is: _"DB access alone should not reveal user content"_ then **application-layer envelope encryption with external KMS** is the best balance for MoMo today.

## Current-State Findings (MoMo)

1. Sensitive text is stored in plaintext:
- `chat_messages.content` is plaintext (`schema/momo_snapshot.sql:363-372`).
- `expenses.note` and `expenses.merchant` are plaintext (`schema/momo_snapshot.sql:378-392`).
- `category_rules.normalized_text` stores normalized user text and is indexed (`supabase/migrations/20260406101500_category_rules.sql:1-26`).

2. Chat and expense flows assume readable text end-to-end:
- Message insert writes plaintext `content` (`src/lib/actions/chat-messages.ts:37-46`).
- Parsing uses `message.content` server-side (`src/lib/helpers/chat/chat-processor.ts:88-92`).
- Parsed raw text is persisted to `expenses.note` (`src/lib/helpers/expenses/expense-persistence.ts:32-40`).
- Chat/history/sync read `content` directly (`src/lib/helpers/chat/chat-messages.ts:44-156`, `src/app/api/chat-sync/route.ts:11-61`).

3. Stats depend on plaintext structured fields:
- Rollups query `expenses.amount_cents`, `category`, `expense_date` (`src/lib/helpers/expenses-stats/personal-rollup.ts:39-57`).
- DB views aggregate those same fields (`schema/momo_snapshot.sql:398-440` and related views).

4. Access model:
- RLS policies are in place (`schema/momo_snapshot.sql:734-765`).
- `service_role` still has broad table grants in baseline migration (`supabase/migrations/20260318162958_baseline_20260318112957.sql:1024-1032`).
- Supabase itself documents that service keys can bypass RLS for administrative tasks.

5. Available crypto primitives:
- `pgcrypto` and `supabase_vault` are installed (`supabase/migrations/20260318162958_baseline_20260318112957.sql:48-56`).

## Standards / Official Guidance Relevant to This Decision

1. OWASP Cryptographic Storage Cheat Sheet:
- Start with a threat model and pick encryption layer accordingly.
- Prefer AEAD modes (e.g., GCM/CCM), separate keys from data, and use dedicated key management.

2. PostgreSQL `pgcrypto` docs:
- `pgcrypto` runs inside DB server.
- If you cannot trust system/database admins, do crypto in the client application.

3. Supabase docs:
- Service keys can bypass RLS (admin path).
- `pgsodium` is pending deprecation and not recommended for new usage.
- Supabase Vault keeps secrets encrypted on disk; decrypted access must be tightly controlled.

4. NIST SP 800-57 Part 1:
- Key lifecycle and protection requirements should be first-class design concerns.

5. Envelope encryption guidance (Cloud KMS docs):
- Use per-object/per-write DEKs wrapped by centrally managed KEKs; rotate KEKs and never store plaintext DEKs.

## Option 1: Database-Side Column Encryption (pgcrypto + Vault)

### What it is

Encrypt sensitive columns in Postgres (`content`, `note`, `merchant`, `normalized_text`) using `pgp_sym_encrypt`/`pgp_sym_decrypt` with keys retrieved from Vault.

### Fit with current MoMo

- Minimal application contract change if you expose decrypted values via SQL view/RPC.
- Can preserve current chat/status/realtime UX.

### Benefits

- Fastest implementation path.
- Keeps current architecture mostly intact.
- Backfill can be done in-place with additive migrations.

### Risks / limits

- **Does not meet strict zero-knowledge against DB/superuser operators.**
- DB-admin trust remains required (explicitly called out by PostgreSQL docs).
- Higher chance of accidental plaintext exposure via debug queries/functions.

### Best for

Teams wanting stronger at-rest protection and simpler rollout, but accepting trusted DB operators.

## Option 2: Application-Layer Envelope Encryption with External KMS (Recommended Balance)

### What it is

Encrypt sensitive payloads in the server app before DB write:
- Generate DEK per row/message (or short-lived batch).
- Encrypt plaintext with AEAD (e.g., AES-256-GCM or XChaCha20-Poly1305).
- Wrap DEK with KEK in external KMS.
- Store ciphertext + wrapped DEK + key version in DB.

### Fit with current MoMo

- Preserve existing UX by decrypting in server data layer before returning facade payloads.
- Keep `amount_cents`, `expense_date`, and `category` plaintext initially so stats and charts stay unchanged.
- Keep cursor ordering (`created_at`, `id`) unchanged for realtime/sync semantics.

### Benefits

- DB dumps and direct DB access no longer reveal sensitive text without KMS.
- Better key governance/audit/rotation posture.
- Compatible with zero-downtime dual-write + backfill migration.

### Risks / limits

- If the same human/operator controls app runtime secrets + KMS + DB, they can still decrypt.
- More implementation complexity (key versions, rewrap flows, failure handling).
- Equality lookup use-cases need blind indexes/HMAC (e.g., for `category_rules.normalized_text` uniqueness).

### Best for

Strong practical privacy improvement now, with minimal UX disruption.

## Option 3: Client-Side End-to-End Encryption (Strict Zero-Knowledge)

### What it is

Encrypt on device before sending to backend; backend stores ciphertext only. Keys remain user-controlled (or device-controlled) and are never available to server operators.

### Fit with current MoMo

- Largest change: current server-side parsing/classification (`processChatMessage`) depends on plaintext content.
- To preserve UX, parsing/categorization must move client-side (or use privacy-preserving compute design).
- Household sharing requires group key management and member change rekey strategy.

### Benefits

- Only option that truly prevents backend/database admins from reading message/expense text.
- Strongest trust posture for privacy-sensitive users.

### Risks / limits

- Significant product and operational complexity (key recovery, multi-device sync, household membership changes).
- Harder analytics/search unless you store some structured metadata plaintext by design.

### Best for

Products with explicit zero-knowledge promise and willingness to redesign parts of the pipeline.

## Comparison Matrix

| Criterion | Option 1: DB-side crypto | Option 2: App-layer envelope | Option 3: Client E2EE |
| --- | --- | --- | --- |
| Protects against DB snapshot theft | Yes | Yes | Yes |
| Protects against DB admin with SQL access | Partial | Strong (if KMS isolated) | Yes |
| Protects against full backend operator | No | Partial | Yes |
| Preserves current UX with small changes | High | Medium-High | Low |
| Migration complexity | Low-Medium | Medium | High |
| Long-term trust posture | Medium | High | Very High |

## Recommended Path for MoMo

1. Adopt **Option 2** now (application-layer envelope encryption) for:
- `chat_messages.content`
- `expenses.note`
- `expenses.merchant`
- `category_rules.normalized_text` (plus blind index for uniqueness/equality lookups)

2. Keep `amount_cents`, `expense_date`, `category`, and status fields plaintext in phase 1 to preserve stats, filters, and UX.

3. Reassess after rollout:
- If your product promise evolves to strict zero-knowledge, plan a Phase 2 transition toward Option 3.

## Zero-Downtime Migration Plan (No UX/Data Breakage)

### Phase 0: Preparation

1. Define sensitivity tiers:
- Tier A (encrypt now): free text and normalized text.
- Tier B (keep plaintext for product behavior): amount/date/category/status.

2. Add key metadata model:
- `key_version`, `wrapped_dek`, `ciphertext`, `nonce`/AEAD payload columns.

### Phase 1: Additive schema changes

1. Add nullable encrypted columns (no destructive changes).
2. Add blind-index columns where equality lookups/uniqueness are required.
3. Add indexes for blind-index columns.

### Phase 2: Dual-write

1. On new writes, store encrypted columns + existing plaintext columns.
2. On reads, prefer decrypted encrypted path when present; fallback to plaintext.
3. Keep facade contracts unchanged (`payload + optional errorCode`).

### Phase 3: Backfill historical data (since Nov users)

1. Batch-encrypt old rows by `created_at` windows.
2. Use idempotent migration jobs with checkpoints.
3. Validate counts + sampled decrypt parity + app behavior checks.

### Phase 4: Cutover

1. Stop writing plaintext sensitive fields.
2. Keep plaintext columns temporarily for safe rollback.
3. After verification window, null/drop plaintext sensitive columns.

### Phase 5: Key rotation and audit

1. Rotate KEKs by rewrapping DEKs (no full data decrypt required).
2. Log all decrypt operations and alert on anomalous access patterns.

## Important Reality Check

If your requirement is literally:

> “As Supabase admin, I should not be able to read any user messages/expenses.”

Then Option 1 is insufficient, and Option 2 only helps if key custody is truly separated from DB access.  
For strict guarantees against platform/backend operators, Option 3 (client-side E2EE) is the only robust model.

## References

1. OWASP Cryptographic Storage Cheat Sheet  
https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

2. PostgreSQL `pgcrypto` documentation (security limitations and trust assumptions)  
https://www.postgresql.org/docs/current/pgcrypto.html

3. Supabase Row Level Security docs (service key bypass context)  
https://supabase.com/docs/guides/database/postgres/row-level-security

4. Supabase `pgsodium` extension page (pending deprecation; new usage not recommended)  
https://supabase.com/docs/guides/database/extensions/pgsodium

5. Supabase Vault docs (encrypted secret storage, key separation concepts)  
https://supabase.com/docs/guides/database/vault

6. NIST SP 800-57 Part 1 Rev. 5 (key management guidance)  
https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final

7. RFC 5116 (AEAD interface and requirements)  
https://datatracker.ietf.org/doc/html/rfc5116

8. Cloud KMS Envelope Encryption guide (DEK/KEK best practices)  
https://docs.cloud.google.com/kms/docs/envelope-encryption
