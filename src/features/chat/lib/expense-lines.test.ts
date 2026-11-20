import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseRecord } from '@lib-types/expenses';
import {
  expectsLines,
  lineKey,
  toExpenseLines,
  totalsByCurrency,
  toUpdateInput,
} from './expense-lines';

function record(overrides: Partial<ExpenseRecord>): ExpenseRecord {
  return {
    id: 'e-1',
    household_id: null,
    user_id: 'u-1',
    chat_message_id: 'm-1',
    amount_cents: 1250,
    currency: 'USD',
    expense_date: '2026-11-20',
    merchant: null,
    category: 'dining',
    note: 'lunch 12.50',
    created_at: '2026-11-20T12:00:00Z',
    tags: [],
    ...overrides,
  };
}

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm-1',
    household_id: null,
    user_id: 'u-1',
    content: 'lunch 12.50',
    status: 'processed',
    expense_count: 1,
    created_at: '2026-11-20T12:00:00Z',
    sender_name: 'Alex',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

describe('toExpenseLines', () => {
  it('reads the descriptor from the original text, keeping accents', () => {
    const [line] = toExpenseLines(
      [record({ note: 'cafe con leche 4.50', amount_cents: 450 })],
      'Café con leche 4.50',
    );
    expect(line.descriptor).toBe('Café con leche');
    expect(line.amountMinor).toBe(450);
  });

  it('matches each line to its own part of a multi-expense message', () => {
    const lines = toExpenseLines(
      [
        record({ id: 'e-1', note: 'electric bill 94.12', amount_cents: 9412 }),
        record({ id: 'e-2', note: 'internet 60', amount_cents: 6000 }),
      ],
      'Electric bill 94.12, Internet 60',
    );
    expect(lines.map(line => line.descriptor)).toEqual([
      'Electric bill',
      'Internet',
    ]);
  });

  it('keeps the order the lines were typed in', () => {
    const lines = toExpenseLines(
      [
        record({ id: 'e-2', note: 'wine 18', amount_cents: 1800 }),
        record({ id: 'e-1', note: 'groceries 82.40', amount_cents: 8240 }),
      ],
      'groceries 82.40, wine 18',
    );
    expect(lines.map(line => line.descriptor)).toEqual(['Groceries', 'Wine']);
  });

  it('skips parts of the message that produced no expense', () => {
    const [line] = toExpenseLines(
      [record({ note: 'tacos 9', amount_cents: 900 })],
      'remember the gym, tacos 9',
    );
    expect(line.descriptor).toBe('Tacos');
  });

  it('keeps numbers that are part of the name', () => {
    const [line] = toExpenseLines(
      [record({ note: '7 eleven 4.50', amount_cents: 450 })],
      '7 eleven 4.50',
    );
    expect(line.descriptor).toBe('7 eleven');
  });

  it('prefers the merchant when one was saved', () => {
    const [line] = toExpenseLines(
      [record({ merchant: 'Thai Orchid', note: 'dinner 55.70' })],
      'dinner 55.70',
    );
    expect(line.descriptor).toBe('Thai Orchid');
  });

  it('treats COP amounts as whole pesos', () => {
    const [line] = toExpenseLines(
      [
        record({
          currency: 'COP',
          note: 'almuerzo 25000',
          amount_cents: 25000,
        }),
      ],
      'almuerzo 25000',
    );
    expect(line.descriptor).toBe('Almuerzo');
    expect(line.currency).toBe('COP');
  });

  it('turns the "uncategorized" default and unknown slugs into null', () => {
    const lines = toExpenseLines(
      [
        record({ id: 'e-1', category: 'uncategorized' }),
        record({ id: 'e-2', category: 'coffee_beans' }),
        record({ id: 'e-3', category: null }),
      ],
      'lunch 12.50',
    );
    expect(lines.map(line => line.category)).toEqual([null, null, null]);
  });
});

describe('totalsByCurrency', () => {
  it('adds spending per currency and leaves income out', () => {
    const lines = toExpenseLines(
      [
        record({ id: 'e-1', amount_cents: 1000 }),
        record({ id: 'e-2', amount_cents: 500 }),
        record({ id: 'e-3', amount_cents: 300000, category: 'income' }),
        record({ id: 'e-4', amount_cents: 20000, currency: 'COP' }),
      ],
      '',
    );
    expect(Object.fromEntries(totalsByCurrency(lines))).toEqual({
      USD: 1500,
      COP: 20000,
    });
  });
});

describe('toUpdateInput', () => {
  it('builds the payload the expense update action expects', () => {
    const [line] = toExpenseLines(
      [record({ amount_cents: 1250, merchant: 'Chipotle' })],
      'lunch 12.50',
    );
    expect(toUpdateInput(line, 'dining')).toEqual({
      id: 'e-1',
      amount: '12.5',
      expense_date: '2026-11-20',
      category: 'dining',
      merchant: 'Chipotle',
      currency: 'USD',
    });
  });
});

describe('lineKey / expectsLines', () => {
  it('changes when status or expense count changes', () => {
    expect(lineKey(message({}))).toBe('processed:1');
    expect(lineKey(message({ status: 'needs_category' }))).toBe(
      'needs_category:1',
    );
  });

  it('only expects lines for persisted user messages with expenses', () => {
    expect(expectsLines(message({}))).toBe(true);
    expect(expectsLines(message({ id: 'tmp-1' }))).toBe(false);
    expect(expectsLines(message({ expense_count: 0 }))).toBe(false);
    expect(expectsLines(message({ author_kind: 'momo' }))).toBe(false);
  });
});
