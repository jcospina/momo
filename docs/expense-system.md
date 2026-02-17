# Expense System

## Overview

Users log expenses by typing messages in the chat interface. The system parses natural language text into structured expense entries with amounts, categories, and tags.

## Parsing Pipeline

Located in `src/lib/helpers/expenses/`. The pipeline runs synchronously on message send:

```txt
Raw text → normalize → split entries → extract amounts → score categories → extract tags → create expenses
```

### 1. Text Normalization (`expense-normalize.ts`)

Cleans the input text: lowercases, trims whitespace, normalizes separators.

### 2. Amount Extraction (`expense-parser.ts`)

Parses numeric amounts from text. Supports:

- Plain numbers: `5000`, `12.50`
- Multiplier suffixes: `5k` → 5,000; `1.5m` → 1,500,000
- Multiple entries in one message (split by newlines or commas)

### 3. Category Scoring (`expense-category.ts`)

Uses n-gram matching against a dictionary to classify expenses. See [ADR-003](adr/003-n-gram-category-scoring.md) for design rationale.

**How it works:**

1. Tokenize the input text (remove special chars, split on whitespace)
2. Build n-gram spans (1–3 grams, largest processed first) from tokens
3. Look up each n-gram in an inverted index built from `@constants/expenses/dictionary`
4. If no exact match, fall back to **fuzzy matching** using Damerau-Levenshtein edit distance (max distance: 2). Candidates are pre-filtered by character bigram overlap (threshold: 0.5) to avoid expensive distance calculations on unlikely matches.
5. Score each category based on match count and type (exact vs fuzzy, weighted by the scoring config)
6. Return the highest-scoring category only if it exceeds both a minimum confidence and a minimum margin over the runner-up — otherwise return `uncategorized`

The module caches term bigrams and misspelling resolutions for performance.

### 4. Tag Extraction

Tags are derived from the terms that matched during category scoring. They provide searchable metadata for expenses. Tags are normalized by the `clean_expense_tags` database trigger (lowercased, deduplicated, validated format).

## Chat Message Processing

The `processChatMessage` function orchestrates the full flow:

1. Parse the message text into expense entries (amounts + categories)
2. Create expense rows in the database, linked to the chat message
3. Update the chat message status:
   - `processed` — At least one expense was created successfully
   - `needs_category` — Expenses created but one or more couldn't be categorized
   - `no_expense` — No parseable expense found in the text
   - `failed` — Processing error occurred

Processing is synchronous within the server action. See [ADR-001](adr/001-synchronous-chat-processing.md) for why.

## Currency Handling

The app supports three currencies with different storage strategies:

| Currency | Storage | On input | On display |
| ---------- | --------- | ---------- | ------------ |
| COP | Whole units (no cents) | Store as-is | Display as-is |
| EUR | Minor units (cents) | Multiply by 100 | Divide by 100 |
| USD | Minor units (cents) | Multiply by 100 | Divide by 100 |

The `amount_cents` column is a `bigint` with a `CHECK (amount_cents > 0)` constraint. The column name reflects that most currencies use cents, but COP values are stored as whole pesos.

## Expense Editing

Users can edit expenses after creation:

- Reassign categories (especially for `needs_category` messages)
- When all expenses in a message have categories assigned, the message status updates from `needs_category` to `processed`
