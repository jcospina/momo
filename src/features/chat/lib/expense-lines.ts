import { isExpenseCategory } from '@constants/expenses/categories';
import type { ChatMessage } from '@lib-types/chat';
import type {
  ExpenseCategory,
  ExpenseRecord,
  ExpenseUpdateInput,
} from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { isMomoMessage } from '@utils/chat-message';
import {
  displayAmount,
  toAmountInput,
  toSupportedCurrency,
} from '@utils/currency';
import { normalizeExpenseText } from '@utils/expense-text';

/** One parsed expense, ready to print on a chat ticket. */
export type ExpenseLine = {
  id: string;
  /** What the person typed for it ("Thai orchid"), never the amount. */
  descriptor: string;
  amountMinor: number;
  currency: SupportedCurrency;
  /** `null` until a known category is filed ("uncategorized" included). */
  category: ExpenseCategory | null;
  merchant: string | null;
  expenseDate: string;
};

/** Lines go stale whenever a message's status or line count changes. */
export function lineKey(message: ChatMessage): string {
  return `${message.status}:${message.expense_count}`;
}

/** Only persisted user messages that produced expenses have lines to load. */
export function expectsLines(message: ChatMessage): boolean {
  return (
    !isMomoMessage(message) &&
    !message.id.startsWith('tmp-') &&
    message.expense_count > 0
  );
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

const NUMBER_TOKEN = /[+$€]?\d[\d.,]*(?:[km])?\b/gi;

/**
 * Drops the amount from a segment ("thai orchid 55.70" → "thai orchid").
 * Prefers the number matching the stored amount so a number that is part of
 * the name ("7 eleven 4.50") survives; otherwise drops the last number.
 */
function stripAmount(
  segment: string,
  amountMinor: number,
  currency: SupportedCurrency,
): string {
  const tokens = [...segment.matchAll(NUMBER_TOKEN)];
  if (tokens.length === 0) return collapseSpaces(segment);
  const target = displayAmount(amountMinor, currency);
  const exact = tokens.find(token => {
    const value = Number(token[0].replace(/[+$€,]/g, ''));
    return Number.isFinite(value) && Math.abs(value - target) < 0.005;
  });
  const drop = exact ?? tokens[tokens.length - 1];
  const index = drop.index ?? 0;
  return collapseSpaces(
    `${segment.slice(0, index)} ${segment.slice(index + drop[0].length)}`,
  )
    .replace(/[\s,;:—–-]+$/, '')
    .trim();
}

/**
 * Turns stored rows into ticket lines. The descriptor comes from the
 * merchant when set, otherwise from the matching comma-separated part of the
 * original message (stored notes are lowercased and stripped of accents, so
 * the original text reads better), otherwise from the note itself.
 */
export function toExpenseLines(
  records: ExpenseRecord[],
  content: string,
): ExpenseLine[] {
  const segments = content
    .split(',')
    .map(segment => segment.trim())
    .filter(Boolean)
    .map(original => ({
      original,
      normalized: collapseSpaces(normalizeExpenseText(original)),
      used: false,
    }));

  const lines = records.map(record => {
    const currency = toSupportedCurrency(record.currency);
    const merchant = record.merchant?.trim() || null;
    const note = collapseSpaces(record.note ?? '');
    const matchIndex = segments.findIndex(
      segment => !segment.used && segment.normalized === note,
    );
    const match = matchIndex >= 0 ? segments[matchIndex] : undefined;
    if (match) match.used = true;

    const source = merchant ?? match?.original ?? note;
    const descriptor =
      merchant ?? stripAmount(source, record.amount_cents, currency);

    return {
      // Where it was typed; lines saved together share a timestamp, so the
      // stored order says nothing about the order the person wrote them in.
      position: matchIndex >= 0 ? matchIndex : Number.MAX_SAFE_INTEGER,
      line: {
        id: record.id,
        descriptor: capitalize(descriptor) || capitalize(note),
        amountMinor: record.amount_cents,
        currency,
        category: isExpenseCategory(record.category) ? record.category : null,
        merchant,
        expenseDate: record.expense_date,
      } satisfies ExpenseLine,
    };
  });

  // Array.prototype.sort is stable, so unmatched lines keep stored order.
  return lines
    .sort((first, second) => first.position - second.position)
    .map(entry => entry.line);
}

/** Spend per currency, income left out (it isn't spending). */
export function totalsByCurrency(
  lines: ExpenseLine[],
): Map<SupportedCurrency, number> {
  const totals = new Map<SupportedCurrency, number>();
  for (const line of lines) {
    if (line.category === 'income') continue;
    totals.set(
      line.currency,
      (totals.get(line.currency) ?? 0) + line.amountMinor,
    );
  }
  return totals;
}

/** The single-line payload `updateExpenses` needs to file a category. */
export function toUpdateInput(
  line: ExpenseLine,
  category: ExpenseCategory,
): ExpenseUpdateInput {
  return {
    id: line.id,
    amount: toAmountInput(line.amountMinor, line.currency),
    expense_date: line.expenseDate,
    category,
    merchant: line.merchant,
    currency: line.currency,
  };
}
