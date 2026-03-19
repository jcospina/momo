import {
  AMOUNT_REGEX,
  DEFAULT_CURRENCY,
  MULTIPLIERS,
} from '@constants/expenses/amounts';
import type { EntryError, ParsedEntry, ParseResult } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { scoreExpenseCategory } from './expense-category';
import { normalizeExpenseText } from './expense-normalize';

export const normalizeInput = normalizeExpenseText;
const EXPLICIT_INCOME_REGEX =
  /(?:^|\s)\+\s*[0-9]+(?:\.[0-9]+)?(?:[kKmM])?(?:$|[\s.])/;

export function splitEntries(normalized: string) {
  return normalized
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

function classifyEntryType(
  entry: string,
  category: ParsedEntry['category'],
): Pick<ParsedEntry, 'entry_type' | 'has_uncertain_type'> {
  if (EXPLICIT_INCOME_REGEX.test(entry)) {
    return { entry_type: 'income', has_uncertain_type: false };
  }

  if (category === 'income') {
    return { entry_type: 'income', has_uncertain_type: true };
  }

  return { entry_type: 'expense', has_uncertain_type: false };
}

function toMinorUnits(value: number, currency: SupportedCurrency) {
  if (currency === 'COP') {
    return Math.round(value);
  }
  return Math.round(value * 100);
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
    const match = entry.match(AMOUNT_REGEX);
    if (!match) {
      errors.push({
        raw: entry,
        normalized: entry,
        errorCode: 'amount_missing',
      });
      return;
    }

    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({
        raw: entry,
        normalized: entry,
        errorCode: 'amount_non_positive',
      });
      return;
    }

    const suffix = match[2] ? match[2].toLowerCase() : null;
    const multiplier = suffix ? (MULTIPLIERS[suffix] ?? 1) : 1;
    const amountMinor = toMinorUnits(value * multiplier, currency);

    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      errors.push({
        raw: entry,
        normalized: entry,
        errorCode: 'amount_non_positive',
      });
      return;
    }

    const { tags, category } = scoreExpenseCategory(entry);

    const entryType = classifyEntryType(entry, category);

    parsed.push({
      raw: entry,
      normalized: entry,
      amount_minor: amountMinor,
      multiplier,
      currency,
      tags,
      category,
      entry_type: entryType.entry_type,
      has_uncertain_type: entryType.has_uncertain_type,
    });
  });

  if (!parsed.length) {
    return { status: 'no_expense', entries: [], errors };
  }

  return { status: 'parsed', entries: parsed, errors };
}
