import type { ExpenseRecord } from '@lib-types/expenses';
import {
  buildQueryExpensesResult,
  type ExpenseAnalyticsContext,
  resolveDateRangeFromCurrentDate,
} from './expense-analytics';

const context: ExpenseAnalyticsContext = {
  currency: 'USD',
  currentUserId: 'user-current',
  householdId: 'household-1',
};

const rows: ExpenseRecord[] = [
  expense({
    id: '1',
    amount_cents: 1000,
    category: 'groceries',
    expense_date: '2026-04-01',
    household_id: null,
    note: 'groceries at costco',
    tags: ['groceries', 'costco', 'groceries costco'],
    user_id: 'user-current',
  }),
  expense({
    id: '2',
    amount_cents: 2400,
    category: 'dining',
    expense_date: '2026-04-02',
    household_id: 'household-1',
    note: 'pizza night',
    tags: ['pizza', 'pizza night'],
    user_id: 'user-current',
  }),
  expense({
    id: '3',
    amount_cents: 3100,
    category: 'utilities',
    expense_date: '2026-04-03',
    household_id: 'household-1',
    note: 'power bill',
    tags: ['power', 'power bill'],
    user_id: 'user-member',
  }),
  expense({
    id: '4',
    amount_cents: 8000,
    category: 'income',
    expense_date: '2026-04-04',
    household_id: null,
    note: 'paycheck',
    tags: ['paycheck'],
    user_id: 'user-current',
  }),
];

describe('agent expense analytics', () => {
  it('resolves relative date ranges from a supplied current date', () => {
    expect(
      resolveDateRangeFromCurrentDate(
        {
          timezone: null,
          referenceDate: null,
          preset: 'last_month',
          startDate: null,
          endDate: null,
        },
        { currentDate: '2026-05-06' },
      ),
    ).toMatchObject({
      currentDate: '2026-05-06',
      currentMonth: '2026-05',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      label: 'Last month',
    });
  });

  it('keeps personal scope to current-user rows across personal and household contexts', () => {
    const result = buildQueryExpensesResult({
      context,
      input: {
        scope: 'personal',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: true,
        limit: null,
      },
      rows,
    });

    expect(result.expenses.map(row => row.id)).toEqual(['1', '2', '4']);
  });

  it('applies tag filters and bounded query truncation', () => {
    const result = buildQueryExpensesResult({
      context,
      input: {
        scope: 'personal',
        startDate: null,
        endDate: null,
        categories: null,
        merchants: null,
        tags: ['pizza night'],
        includeIncome: null,
        limit: 0,
      },
      rows,
    });

    expect(result.expenses).toEqual([]);
    expect(result.truncated).toBe(true);
  });
});

function expense(
  input: Partial<ExpenseRecord> & { id: string },
): ExpenseRecord {
  return {
    id: input.id,
    household_id: input.household_id ?? null,
    user_id: input.user_id ?? 'user-current',
    chat_message_id: `message-${input.id}`,
    amount_cents: input.amount_cents ?? 0,
    currency: 'USD',
    expense_date: input.expense_date ?? '2026-04-01',
    merchant: input.merchant ?? null,
    category: input.category ?? null,
    note: input.note ?? null,
    created_at: `${input.expense_date ?? '2026-04-01'}T12:00:00.000Z`,
    tags: input.tags ?? [],
  };
}
