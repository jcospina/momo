import type { ExpenseRecord } from '@lib-types/expenses';
import {
  buildQueryExpensesResult,
  buildSpendingStatsResult,
  type ExpenseAnalyticsContext,
  resolveDateRangeFromCurrentDate,
} from './expense-analytics';

const context: ExpenseAnalyticsContext = {
  currency: 'USD',
  currentUserId: 'user-current',
  householdId: 'household-1',
  otherUserId: 'user-member',
};

const rows: ExpenseRecord[] = [
  expense({
    id: '1',
    amount_cents: 1000,
    category: 'groceries',
    expense_date: '2026-04-01',
    household_id: null,
    note: 'groceries at costco',
    tags: ['groceries', 'costco', 'groceries at costco'],
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

  it('keeps household scope to shared household rows and preserves user grouping labels', () => {
    const result = buildSpendingStatsResult({
      context,
      input: {
        scope: 'household',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: null,
        groupBy: 'user',
        limit: null,
      },
      rows,
    });

    expect(result.totalExpenseCents).toBe(5500);
    expect(result.groups).toEqual([
      {
        label: 'Household member',
        amountCents: 3100,
        transactionCount: 1,
        percentageOfTotal: 56.36,
        tags: [{ tag: 'power bill', count: 1, amountCents: 3100 }],
      },
      {
        label: 'Current user',
        amountCents: 2400,
        transactionCount: 1,
        percentageOfTotal: 43.64,
        tags: [{ tag: 'pizza night', count: 1, amountCents: 2400 }],
      },
    ]);
  });

  it('does not compute income or net fields for expense-only stats', () => {
    const result = buildSpendingStatsResult({
      context,
      input: {
        scope: 'personal',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: false,
        groupBy: null,
        limit: null,
      },
      rows,
    });

    expect(result.totalExpenseCents).toBe(3400);
    expect(result.totalIncomeCents).toBe(0);
    expect(result.netCents).toBe(0);
    expect(result.savingsRate).toBeNull();
  });

  it('computes income and net fields only when income is explicitly included', () => {
    const result = buildSpendingStatsResult({
      context,
      input: {
        scope: 'personal',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: true,
        groupBy: null,
        limit: null,
      },
      rows,
    });

    expect(result.totalExpenseCents).toBe(3400);
    expect(result.totalIncomeCents).toBe(8000);
    expect(result.netCents).toBe(4600);
    expect(result.savingsRate).toBe(0.575);
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

describe('agent spending stats tag sidecar', () => {
  it('assigns each expense to a single primary tag bucket', () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: [
        expense({
          id: 'single-row',
          amount_cents: 1500,
          category: 'groceries',
          expense_date: '2026-04-10',
          tags: ['a', 'b', 'c'],
          user_id: 'user-current',
        }),
      ],
    });

    const totalAmount = result.tags.reduce(
      (sum, entry) => sum + entry.amountCents,
      0,
    );
    expect(result.tags).toHaveLength(1);
    expect(totalAmount).toBe(1500);
  });

  it('prefers the longest n-gram on equal frequency', () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: [
        expense({
          id: 'whole-foods',
          amount_cents: 2000,
          category: 'groceries',
          expense_date: '2026-04-10',
          tags: ['whole', 'foods', 'whole foods'],
          user_id: 'user-current',
        }),
      ],
    });

    expect(result.tags).toEqual([
      { tag: 'whole foods', count: 1, amountCents: 2000 },
    ]);
  });

  it('prefers higher frequency over longer length', () => {
    const sharedRows = [
      expense({
        id: 'a-1',
        amount_cents: 1000,
        category: 'groceries',
        expense_date: '2026-04-01',
        tags: ['a'],
        user_id: 'user-current',
      }),
      expense({
        id: 'a-2',
        amount_cents: 1000,
        category: 'groceries',
        expense_date: '2026-04-02',
        tags: ['a'],
        user_id: 'user-current',
      }),
      expense({
        id: 'mixed',
        amount_cents: 4000,
        category: 'groceries',
        expense_date: '2026-04-03',
        tags: ['a', 'banana banana'],
        user_id: 'user-current',
      }),
    ];

    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: sharedRows,
    });

    const primaryA = result.tags.find(entry => entry.tag === 'a');
    expect(primaryA).toBeDefined();
    expect(primaryA?.count).toBe(3);
    expect(primaryA?.amountCents).toBe(6000);
    expect(
      result.tags.find(entry => entry.tag === 'banana banana'),
    ).toBeUndefined();
  });

  it('breaks length ties alphabetically (first wins)', () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: [
        expense({
          id: 'kale-row',
          amount_cents: 1200,
          category: 'groceries',
          expense_date: '2026-04-10',
          tags: ['kale', 'lime'],
          user_id: 'user-current',
        }),
      ],
    });

    expect(result.tags).toEqual([{ tag: 'kale', count: 1, amountCents: 1200 }]);
  });

  it('recomputes primary tags within the filtered universe', () => {
    const fixture = [
      expense({
        id: 'x-1',
        amount_cents: 1000,
        category: 'groceries',
        expense_date: '2026-04-01',
        tags: ['x'],
        user_id: 'user-current',
      }),
      expense({
        id: 'x-2',
        amount_cents: 1000,
        category: 'groceries',
        expense_date: '2026-04-02',
        tags: ['x'],
        user_id: 'user-current',
      }),
      expense({
        id: 'mixed',
        amount_cents: 3000,
        category: 'dining',
        expense_date: '2026-04-03',
        tags: ['x', 'longer tag'],
        user_id: 'user-current',
      }),
    ];

    const broad = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: fixture,
    });
    expect(broad.tags.find(entry => entry.tag === 'x')?.count).toBe(3);

    const narrow = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null, categories: ['dining'] }),
      rows: fixture,
    });
    expect(narrow.tags).toEqual([
      { tag: 'longer tag', count: 1, amountCents: 3000 },
    ]);
  });

  it('excludes untagged expenses from the sidecar but counts them in totals', () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: [
        expense({
          id: 'tagged',
          amount_cents: 1000,
          category: 'groceries',
          expense_date: '2026-04-01',
          tags: ['costco'],
          user_id: 'user-current',
        }),
        expense({
          id: 'untagged',
          amount_cents: 500,
          category: 'groceries',
          expense_date: '2026-04-02',
          tags: [],
          user_id: 'user-current',
        }),
      ],
    });

    expect(result.totalExpenseCents).toBe(1500);
    expect(result.transactionCount).toBe(2);
    const sidecarSum = result.tags.reduce(
      (sum, entry) => sum + entry.amountCents,
      0,
    );
    expect(sidecarSum).toBe(1000);
    expect(sidecarSum).toBeLessThan(result.totalExpenseCents);
  });

  it('caps the sidecar at the top 10 primary tags', () => {
    const manyRows: ExpenseRecord[] = [];
    for (let i = 0; i < 15; i += 1) {
      manyRows.push(
        expense({
          id: `tag-${i}`,
          amount_cents: 1000 + i * 100,
          category: 'groceries',
          expense_date: `2026-04-${String(i + 1).padStart(2, '0')}`,
          tags: [`tag-${i}`],
          user_id: 'user-current',
        }),
      );
    }

    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: 'category' }),
      rows: manyRows,
    });

    expect(result.tags).toHaveLength(10);
    expect(result.groups).not.toBeNull();
    for (const group of result.groups ?? []) {
      expect(group.tags.length).toBeLessThanOrEqual(10);
    }
  });

  it('emits the root tags sidecar when groupBy is null', () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: [
        expense({
          id: 'r1',
          amount_cents: 1000,
          category: 'groceries',
          expense_date: '2026-04-01',
          tags: ['costco'],
          user_id: 'user-current',
        }),
      ],
    });

    expect(result.groups).toBeNull();
    expect(result.tags).toEqual([
      { tag: 'costco', count: 1, amountCents: 1000 },
    ]);
  });

  it("places each expense's primary tag in exactly one group's tags sidecar", () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: 'category' }),
      rows: [
        expense({
          id: 'g-1',
          amount_cents: 1000,
          category: 'groceries',
          expense_date: '2026-04-01',
          tags: ['costco'],
          user_id: 'user-current',
        }),
        expense({
          id: 'd-1',
          amount_cents: 2000,
          category: 'dining',
          expense_date: '2026-04-02',
          tags: ['pizza'],
          user_id: 'user-current',
        }),
      ],
    });

    const counts = new Map<string, number>();
    for (const group of result.groups ?? []) {
      for (const tagEntry of group.tags) {
        counts.set(tagEntry.tag, (counts.get(tagEntry.tag) ?? 0) + 1);
      }
    }
    expect(counts.get('costco')).toBe(1);
    expect(counts.get('pizza')).toBe(1);
  });

  it('keeps the sidecar sum <= total expense cents on mixed fixtures', () => {
    const result = buildSpendingStatsResult({
      context,
      input: filters({ groupBy: null }),
      rows: [
        expense({
          id: 'tagged-1',
          amount_cents: 1000,
          category: 'groceries',
          expense_date: '2026-04-01',
          tags: ['costco'],
          user_id: 'user-current',
        }),
        expense({
          id: 'tagged-2',
          amount_cents: 2000,
          category: 'dining',
          expense_date: '2026-04-02',
          tags: ['pizza', 'pizza night'],
          user_id: 'user-current',
        }),
        expense({
          id: 'no-tags',
          amount_cents: 700,
          category: 'utilities',
          expense_date: '2026-04-03',
          tags: [],
          user_id: 'user-current',
        }),
      ],
    });

    const sidecarSum = result.tags.reduce(
      (sum, entry) => sum + entry.amountCents,
      0,
    );
    expect(sidecarSum).toBeLessThanOrEqual(result.totalExpenseCents);
    expect(sidecarSum).toBe(3000);
    expect(result.totalExpenseCents).toBe(3700);
  });
});

function filters(
  overrides: Partial<Parameters<typeof buildSpendingStatsResult>[0]['input']>,
): Parameters<typeof buildSpendingStatsResult>[0]['input'] {
  return {
    scope: 'personal',
    startDate: null,
    endDate: null,
    categories: null,
    merchants: null,
    tags: null,
    includeIncome: null,
    groupBy: null,
    limit: null,
    ...overrides,
  };
}

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
