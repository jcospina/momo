import { AMOUNT_REGEX } from '@constants/expenses/amounts';
import {
  EXPENSE_INVERTED_INDEX,
  expenseTerms,
} from '@constants/expenses/dictionary';
import {
  BIGRAM_OVERLAP_THRESHOLD,
  EXPENSE_SCORING,
  MAX_EDIT_DISTANCE,
  MIN_FUZZY_TERM_LENGTH,
} from '@constants/expenses/scoring';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseInvertedIndexEntry,
  type ExpenseScoreResult,
} from '@lib-types/expenses';

import { normalizeExpenseText } from './expense-normalize';

type ScoreMap = Record<ExpenseCategory, number>;
type ScoreExpenseCategoryOptions = {
  allowFuzzy?: boolean;
};

const termBigramMap = new Map<string, Set<string>>();
const misspellingCache = new Map<string, string | null>();
const AMOUNT_TOKEN_REGEX = new RegExp(`\\b${AMOUNT_REGEX.source}\\b`, 'gi');
const EXPLICIT_INCOME_REGEX =
  /(?:^|\s)\+\s*[0-9]+(?:\.[0-9]+)?(?:[kKmM])?(?:$|[\s.])/;
const MAX_ONE_EDIT_DISTANCE = 1;
const MAX_ALLOWED_FUZZY_DISTANCE = Math.min(
  MAX_EDIT_DISTANCE,
  MAX_ONE_EDIT_DISTANCE,
);

function initScoreMap(): ScoreMap {
  return EXPENSE_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as ScoreMap);
}

function stripAmountTokens(text: string) {
  return text.replace(AMOUNT_TOKEN_REGEX, ' ');
}

function tokenize(text: string) {
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function buildCategoryKey(input: string): string {
  const normalized = normalizeExpenseText(input ?? '');
  const withoutAmounts = stripAmountTokens(normalized);
  const tokens = tokenize(withoutAmounts);
  return tokens.join(' ');
}

const TAG_NGRAM_MAX = 3;

function tokenizeForTags(input: string): string[] {
  const lowered = (input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const withoutAmounts = lowered.replace(AMOUNT_TOKEN_REGEX, ' ');
  return withoutAmounts
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function extractTagNgrams(input: string, max = TAG_NGRAM_MAX): string[] {
  const tokens = tokenizeForTags(input);
  if (!tokens.length) return [];

  const tags: string[] = [];
  const seen = new Set<string>();
  const upper = Math.min(max, tokens.length);

  for (let size = 1; size <= upper; size += 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      const ngram = tokens.slice(i, i + size).join(' ');
      if (seen.has(ngram)) continue;
      seen.add(ngram);
      tags.push(ngram);
    }
  }

  return tags;
}

export function isExplicitIncomeEntry(input: string): boolean {
  const normalized = normalizeExpenseText(input ?? '');
  return EXPLICIT_INCOME_REGEX.test(normalized);
}

type NgramSpan = {
  text: string;
  start: number;
  end: number;
};

function buildNgramSpans(tokens: string[], max = 3): NgramSpan[] {
  const spans: NgramSpan[] = [];
  for (let size = max; size >= 1; size -= 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      spans.push({
        text: tokens.slice(i, i + size).join(' '),
        start: i,
        end: i + size,
      });
    }
  }
  return spans;
}

function bigrams(value: string) {
  const cleaned = value.replace(/\s+/g, '');
  if (cleaned.length < 2) {
    return new Set(cleaned ? [cleaned] : []);
  }
  const grams = new Set<string>();
  for (let i = 0; i < cleaned.length - 1; i += 1) {
    grams.add(cleaned.slice(i, i + 2));
  }
  return grams;
}

function bigramOverlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let matchCount = 0;
  a.forEach(token => {
    if (b.has(token)) {
      matchCount += 1;
    }
  });
  return matchCount / Math.max(a.size, b.size);
}

function damerauLevenshtein(a: string, b: string) {
  const aLen = a.length;
  const bLen = b.length;
  if (a === b) return 0;
  if (!aLen) return bLen;
  if (!bLen) return aLen;

  const dp: number[][] = Array.from({ length: aLen + 1 }, () =>
    Array(bLen + 1).fill(0),
  );

  for (let i = 0; i <= aLen; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= bLen; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }

  return dp[aLen][bLen];
}

function ensureTermBigrams() {
  if (termBigramMap.size) return;
  expenseTerms.forEach(term => {
    termBigramMap.set(term, bigrams(term));
  });
}

function resolveMisspelling(term: string) {
  if (term.length < MIN_FUZZY_TERM_LENGTH) return null;
  if (misspellingCache.has(term)) {
    return misspellingCache.get(term) ?? null;
  }

  ensureTermBigrams();
  const termGrams = bigrams(term);
  let bestCandidate: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestOverlap = 0;

  for (const candidate of expenseTerms) {
    if (Math.abs(candidate.length - term.length) > MAX_ALLOWED_FUZZY_DISTANCE) {
      continue;
    }
    const candidateGrams = termBigramMap.get(candidate);
    if (!candidateGrams) continue;
    const overlap = bigramOverlap(termGrams, candidateGrams);
    if (overlap < BIGRAM_OVERLAP_THRESHOLD) continue;

    const distance = damerauLevenshtein(term, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = candidate;
      bestOverlap = overlap;
      continue;
    }

    if (distance === bestDistance && overlap > bestOverlap) {
      bestCandidate = candidate;
      bestOverlap = overlap;
    }
  }

  const resolved =
    bestCandidate && bestDistance <= MAX_ALLOWED_FUZZY_DISTANCE
      ? bestCandidate
      : null;
  misspellingCache.set(term, resolved);
  return resolved;
}

function applyMatches(
  matches: ExpenseInvertedIndexEntry[],
  term: string,
  scores: ScoreMap,
  tags: Set<string>,
) {
  if (!matches.length) return;
  tags.add(term);
  matches.forEach(match => {
    scores[match.category] += EXPENSE_SCORING[match.match];
  });
}

export function scoreExpenseCategory(
  input: string,
  options: ScoreExpenseCategoryOptions = {},
): ExpenseScoreResult {
  const { allowFuzzy = true } = options;
  const normalized = normalizeExpenseText(input ?? '');
  const withoutAmounts = stripAmountTokens(normalized);
  const tokens = tokenize(withoutAmounts);
  const scores = initScoreMap();
  const tags = new Set<string>();

  if (!tokens.length) {
    return { category: null, tags: [], scores };
  }

  const ngrams = buildNgramSpans(tokens);
  const claimedTokens = new Set<number>();
  const matchedTerms = new Set<string>();
  let hasExactMatch = false;

  ngrams.forEach(({ text, start, end }) => {
    if (matchedTerms.has(text)) return;
    for (let i = start; i < end; i += 1) {
      if (claimedTokens.has(i)) {
        return;
      }
    }
    const matches = EXPENSE_INVERTED_INDEX[text];
    if (!matches) return;
    hasExactMatch = true;
    matchedTerms.add(text);
    applyMatches(matches, text, scores, tags);
    for (let i = start; i < end; i += 1) {
      claimedTokens.add(i);
    }
  });

  if (allowFuzzy && !hasExactMatch) {
    const fuzzyMatchedTerms = new Set<string>();
    const fuzzyClaimedTokens = new Set<number>();
    ngrams.forEach(({ text, start, end }) => {
      if (fuzzyMatchedTerms.has(text)) return;
      for (let i = start; i < end; i += 1) {
        if (fuzzyClaimedTokens.has(i)) {
          return;
        }
      }
      const corrected = resolveMisspelling(text);
      if (!corrected) return;
      const matches = EXPENSE_INVERTED_INDEX[corrected];
      if (!matches) return;
      fuzzyMatchedTerms.add(text);
      applyMatches(matches, corrected, scores, tags);
      for (let i = start; i < end; i += 1) {
        fuzzyClaimedTokens.add(i);
      }
    });
  }

  const ranked = EXPENSE_CATEGORIES.map(category => ({
    category,
    score: scores[category],
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const runnerUp = ranked[1];
  const runnerScore = runnerUp ? runnerUp.score : 0;

  if (
    top.score >= EXPENSE_SCORING.min_confidence &&
    top.score >= runnerScore + EXPENSE_SCORING.min_margin
  ) {
    return { category: top.category, tags: Array.from(tags), scores };
  }

  return { category: null, tags: Array.from(tags), scores };
}
