---
version: 1.1
last_updated: 2026-05-13
---

# ADR-003: N-gram Category Scoring

## Context

When a user types an expense like "uber 15k" or "almuerzo restaurante 30k", the system needs to assign a category (transport, food, etc.). Options considered:

1. **Exact keyword matching** — Simple but brittle. Fails on typos, word variations, and partial matches.
2. **ML/LLM classification** — Accurate but adds latency, cost, and an external dependency.
3. **N-gram scoring** — Middle ground. Fast, deterministic, handles partial matches.

## Decision

Use n-gram scoring with a manually maintained dictionary as the deterministic baseline. The `expense-category.ts` module generates n-grams from the expense text and scores them against category dictionaries in `@constants/expenses/dictionary`.

The algorithm:

1. Normalize and tokenize the expense text
2. Generate n-grams (substrings of varying lengths)
3. Match against dictionary terms mapped to categories
4. If no exact dictionary terms match, allow a narrow one-edit fuzzy correction
5. Score categories based on match count and quality
6. Return the highest-scoring category above a threshold, or `uncategorized`
7. Apply learned `category_rules` after parsing when the entry is not explicit income and does not need amount review

Current precedence in chat processing is:

1. explicit income marker (`+amount`)
2. learned category rule
3. dictionary/fuzzy score
4. uncategorized

## Consequences

**Benefits:**

- Fast — sub-millisecond, pure computation with no I/O.
- Deterministic — same input always produces the same category.
- Offline-capable — no external service dependency.
- Handles word variations and partial matches better than exact keywords.
- Easy to test — pure function with dictionary input.

**Trade-offs:**

- Requires manual dictionary maintenance for good out-of-the-box behavior. User corrections can teach `category_rules`, but the baseline dictionary still matters.
- Limited to the vocabulary in the dictionary — can't handle truly novel terms.
- Learned rules are scoped to personal or household context and must not override ambiguous amount entries.
- Multilingual support requires separate dictionary entries per language.

## Update 2026-05-13

This ADR covers **category** n-gram scoring only. A separate **tag** n-gram extractor (`extractTagNgrams` in `expense-category.ts`) was added later and reuses the same tokenization, but emits the full set of 1-3 token n-grams after stop-word filtering rather than picking a single winner. The two paths share normalization but produce independent outputs: scoring resolves at most one category per entry, while tag extraction populates `expenses.tags`. See [expense-system.md](../expense-system.md) for the tag pipeline.
