---
version: 1.1
last_updated: 2026-05-13
---

# Expense System

## Overview

Users log expenses by typing messages in chat. The system parses natural language into structured expense entries (amount, category, tags, currency units) and persists them against the source chat message.

## Parsing Pipeline

Core modules live under `src/lib/helpers/expenses/`.

```txt
Raw text -> normalize -> split entries -> extract amount -> score category
  -> extract tag n-grams -> apply learned category rules -> persist expenses
```

Category scoring and tag extraction reuse the same tokenization but emit independent outputs: scoring picks at most one category, tag extraction emits the full set of n-grams.

### 1. Text Normalization (`expense-normalize.ts`)

Normalization currently:

- lowercases input
- removes diacritics (NFD + combining-mark cleanup)
- removes unsupported characters, keeping alphanumerics, spaces, `.` and `,`

### 2. Entry Split + Amount Extraction (`expense-parser.ts`)

- Entries are split by comma.
- Amount parser supports:
  - plain numbers (`5000`, `12.50`)
  - suffix multipliers (`5k`, `1.5m`)
  - explicit plus markers for income disambiguation (`+5000`, `salary +2m`)
- Currency conversion:
  - `COP`: store whole units
  - `USD`/`EUR`: store minor units (x100)

If one entry contains multiple amount candidates, a single explicit `+amount` candidate wins. Otherwise, the first candidate is kept but the entry is marked `needs_review`, which keeps the chat message in `needs_category` until the user resolves it.

If no valid amount entries are found, parse result is `no_expense`.

### 3. Category Scoring (`expense-category.ts`)

Category scoring uses dictionary n-grams plus a narrow fuzzy fallback:

1. tokenize text and build 1-3 gram spans (largest first)
2. attempt exact matches in `EXPENSE_INVERTED_INDEX`
3. if no exact matches exist, try one-edit fuzzy correction (Damerau-Levenshtein, bigram prefilter)
4. score categories with weighted match values
5. choose top category only when confidence and margin thresholds pass; otherwise `uncategorized`

Category scoring no longer drives the tag set — tags are produced independently by the n-gram extraction step below.

See [ADR-003](adr/003-n-gram-category-scoring.md).

### 4. Tag N-gram Extraction (`expense-category.ts`, `tag-stop-words.ts`)

Tags are extracted from the entry text after amount tokens are stripped:

1. lowercase, NFD-normalize, and strip diacritics
2. strip amount tokens (`5k`, `12.50`, `+2m`, etc.)
3. tokenize on non-alphanumeric boundaries
4. drop stop words (`TAG_STOP_WORDS` covers English and Spanish function words such as `the`, `at`, `of`, `el`, `la`, `de`, `y`)
5. emit unique 1-3 token n-grams in size-ascending order, joined by a single space

Stop words are filtered at the token level before the n-gram window, so cross-stop-word n-grams collapse onto their content tokens — for example `groceries at costco` yields `groceries`, `costco`, and `groceries costco`, but not `at`, `groceries at`, or `at costco`.

The extracted tags are persisted as-is on the expense row; downstream filters and aggregates use them for finer-grained slicing than the category alone allows.

### 5. Learned Category Rules

After deterministic parsing, `processChatMessage()` checks `category_rules` for normalized entry text and applies learned categories when present.

Precedence is:

1. explicit income markers (`+amount`)
2. learned category rules
3. dictionary/fuzzy category score
4. uncategorized (`null`)

Learned rules are scoped to the message context:

- personal messages read personal rules (`user_id`, `household_id IS NULL`)
- household messages read household rules (`household_id`)

Entries marked `needs_review` skip learned-rule overrides so ambiguous amounts are not silently categorized.

## Chat Message Processing

`processChatMessage()` (`src/lib/helpers/chat/chat-processor.ts`) orchestrates parse + persistence after message insertion.

Final message statuses:

- `processed` — expenses persisted and categorized
- `needs_category` — expenses persisted, but at least one entry is uncategorized or marked `needs_review`
- `no_expense` — no parseable expense
- `failed` — persistence/update error

Processing is synchronous in the send path (see [ADR-001](adr/001-synchronous-chat-processing.md)).

## Storage Model

- Amount is stored in `expenses.amount_cents` (`bigint`, must be > 0).
- `chat_message_id` links expenses back to chat messages.
- Income is represented as an expense row with `category = 'income'`; expense stats exclude this category unless a cashflow view explicitly includes it.
- Tags are normalized by DB trigger `clean_expense_tags`: each tag is lowercased, trimmed, deduplicated, and must match `^[a-z0-9_]+( [a-z0-9_]+)*$` with length up to 64 characters. The single-space form preserves multi-word n-grams emitted by `extractTagNgrams`.

## Expense Editing

Users can edit existing expenses (amount/date/category/merchant).

- Re-categorization supports resolving `needs_category` messages.
- After updates, message status is recalculated:
  - any uncategorized expense -> `needs_category`
  - all categorized -> `processed`
- Successful categorized edits teach `category_rules` using the normalized original note. Household edits also teach the current user's personal scope so future personal entries can reuse the correction.
