import {
  AMOUNT_REGEX,
  DEFAULT_CURRENCY,
  MULTIPLIERS,
} from '@constants/expenses/amounts';
import type { EntryError, ParsedEntry, ParseResult } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import {
  extractTagNgrams,
  isExplicitIncomeEntry,
  scoreExpenseCategory,
} from './expense-category';
import { normalizeExpenseText } from './expense-normalize';

export const normalizeInput = normalizeExpenseText;

type AmountCandidate = {
  amountMinor: number;
  multiplier: number;
  isExplicitPlus: boolean;
};

export function splitEntries(normalized: string) {
  return normalized
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function resolveCategory(
  entry: string,
  category: ParsedEntry['category'],
  needsReview: boolean,
): Pick<ParsedEntry, 'category'> {
  if (needsReview) {
    return { category: null };
  }

  if (isExplicitIncomeEntry(entry)) {
    return { category: 'income' };
  }

  return { category };
}

function toMinorUnits(value: number, currency: SupportedCurrency) {
  if (currency === 'COP') {
    return Math.round(value);
  }
  return Math.round(value * 100);
}

function isExplicitPlusMatch(entry: string, matchIndex: number) {
  const prefix = entry.slice(0, matchIndex);
  return /(?:^|\s)\+\s*$/.test(prefix);
}

function extractAmountCandidates(
  entry: string,
  currency: SupportedCurrency,
): AmountCandidate[] {
  const amountRegex = new RegExp(AMOUNT_REGEX.source, 'gi');
  const candidates: AmountCandidate[] = [];
  let match = amountRegex.exec(entry);

  while (match) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value) && value > 0) {
      const suffix = match[2] ? match[2].toLowerCase() : undefined;
      const multiplier = suffix ? (MULTIPLIERS[suffix] ?? 1) : 1;
      const amountMinor = toMinorUnits(value * multiplier, currency);

      if (Number.isFinite(amountMinor) && amountMinor > 0) {
        candidates.push({
          amountMinor,
          multiplier,
          isExplicitPlus: isExplicitPlusMatch(entry, match.index),
        });
      }
    }

    match = amountRegex.exec(entry);
  }

  return candidates;
}

function resolveAmountCandidate(
  entry: string,
  currency: SupportedCurrency,
):
  | { candidate: AmountCandidate; needsReview: boolean }
  | { errorCode: 'amount_missing' | 'amount_non_positive' } {
  const candidates = extractAmountCandidates(entry, currency);
  if (!candidates.length) {
    const hasNumericToken = /\d/.test(entry);
    return {
      errorCode: hasNumericToken ? 'amount_non_positive' : 'amount_missing',
    };
  }

  const explicitCandidates = candidates.filter(
    candidate => candidate.isExplicitPlus,
  );

  if (explicitCandidates.length === 1) {
    return { candidate: explicitCandidates[0], needsReview: false };
  }

  if (explicitCandidates.length > 1) {
    return { candidate: explicitCandidates[0], needsReview: true };
  }

  if (candidates.length === 1) {
    return { candidate: candidates[0], needsReview: false };
  }

  return { candidate: candidates[0], needsReview: true };
}

export function parseChatEntries(
  input: string,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
): ParseResult {
  const normalized = normalizeInput(input ?? '');
  const entries = splitEntries(normalized);
  const parsed: ParsedEntry[] = [];
  const errors: EntryError[] = [];

  entries.forEach(entry => {
    const amountResolution = resolveAmountCandidate(entry, currency);
    if ('errorCode' in amountResolution) {
      errors.push({
        raw: entry,
        normalized: entry,
        errorCode: amountResolution.errorCode,
      });
      return;
    }

    const { candidate, needsReview } = amountResolution;
    const { category } = scoreExpenseCategory(entry);
    const entryClassification = resolveCategory(entry, category, needsReview);
    const tags = extractTagNgrams(entry);

    parsed.push({
      raw: entry,
      normalized: entry,
      amount_minor: candidate.amountMinor,
      multiplier: candidate.multiplier,
      currency,
      tags,
      category: entryClassification.category,
      needs_review: needsReview,
    });
  });

  if (!parsed.length) {
    return { status: 'no_expense', entries: [], errors };
  }

  return { status: 'parsed', entries: parsed, errors };
}
