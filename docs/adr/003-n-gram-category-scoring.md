# ADR-003: N-gram Category Scoring

**Status:** Accepted
**Date:** 2026-02-17

## Context

When a user types an expense like "uber 15k" or "almuerzo restaurante 30k", the system needs to assign a category (transport, food, etc.). Options considered:

1. **Exact keyword matching** — Simple but brittle. Fails on typos, word variations, and partial matches.
2. **ML/LLM classification** — Accurate but adds latency, cost, and an external dependency.
3. **N-gram scoring** — Middle ground. Fast, deterministic, handles partial matches.

## Decision

Use n-gram scoring with a manually maintained dictionary. The `expense-category.ts` module generates n-grams from the expense text and scores them against category dictionaries in `@constants/expenses/dictionary`.

The algorithm:

1. Normalize and tokenize the expense text
2. Generate n-grams (substrings of varying lengths)
3. Match against dictionary terms mapped to categories
4. Score categories based on match count and quality
5. Return the highest-scoring category above a threshold, or `uncategorized`

## Consequences

**Benefits:**

- Fast — sub-millisecond, pure computation with no I/O.
- Deterministic — same input always produces the same category.
- Offline-capable — no external service dependency.
- Handles word variations and partial matches better than exact keywords.
- Easy to test — pure function with dictionary input.

**Trade-offs:**

- Requires manual dictionary maintenance. New merchants or categories need dictionary updates.
- Limited to the vocabulary in the dictionary — can't handle truly novel terms.
- No learning from user corrections (though this could be added as a dictionary update mechanism).
- Multilingual support requires separate dictionary entries per language.
