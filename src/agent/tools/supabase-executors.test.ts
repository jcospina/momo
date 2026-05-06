import type { ExpenseRecord } from '@lib-types/expenses';
import { createAgentSupabaseClient } from './supabase-client';
import { getSpendingStats, queryExpenses } from './supabase-executors';

jest.mock('./supabase-client', () => ({
  createAgentSupabaseClient: jest.fn(),
}));

const createAgentSupabaseClientMock = jest.mocked(createAgentSupabaseClient);

describe('Supabase agent tool executors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pushes date filters into Supabase before applying in-memory query semantics', async () => {
    const { supabase, calls } = mockSupabasePages([
      [expense({ id: 'may-1', amount_cents: 5000 })],
    ]);
    createAgentSupabaseClientMock.mockReturnValue(supabase as never);

    const result = await queryExpenses(
      {
        scope: 'personal',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: null,
        limit: null,
      },
      { currency: 'USD', auth: authContext() },
    );

    expect(calls).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'user-1'],
        ['gte', 'expense_date', '2026-05-01'],
        ['lte', 'expense_date', '2026-05-31'],
        ['neq', 'category', 'income'],
        ['range', 0, 999],
      ]),
    );
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]?.id).toBe('may-1');
  });

  it('paginates stats reads past Supabase REST default page limits', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      expense({ id: `row-${index}`, amount_cents: 1 }),
    );
    const secondPage = [expense({ id: 'row-1000', amount_cents: 1 })];
    const { supabase, calls } = mockSupabasePages([firstPage, secondPage]);
    createAgentSupabaseClientMock.mockReturnValue(supabase as never);

    const result = await getSpendingStats(
      {
        scope: 'personal',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: false,
        groupBy: null,
        limit: null,
      },
      { currency: 'USD', auth: authContext() },
    );

    expect(calls).toEqual(
      expect.arrayContaining([
        ['range', 0, 999],
        ['range', 1000, 1999],
      ]),
    );
    expect(calls).toContainEqual(['neq', 'category', 'income']);
    expect(result.transactionCount).toBe(1001);
    expect(result.totalExpenseCents).toBe(1001);
  });

  it('includes income in stats reads only when requested', async () => {
    const { supabase, calls } = mockSupabasePages([
      [
        expense({ id: 'expense-1', amount_cents: 1000 }),
        expense({
          id: 'income-1',
          amount_cents: 3000,
          category: 'income',
        }),
      ],
    ]);
    createAgentSupabaseClientMock.mockReturnValue(supabase as never);

    const result = await getSpendingStats(
      {
        scope: 'personal',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: true,
        groupBy: null,
        limit: null,
      },
      { currency: 'USD', auth: authContext() },
    );

    expect(calls).not.toContainEqual(['neq', 'category', 'income']);
    expect(result.totalExpenseCents).toBe(1000);
    expect(result.totalIncomeCents).toBe(3000);
    expect(result.netCents).toBe(2000);
  });
});

function mockSupabasePages(pages: ExpenseRecord[][]) {
  const calls: unknown[][] = [];
  let rangeCalls = 0;

  type MockQuery = {
    eq: jest.Mock<MockQuery, [string, unknown]>;
    gte: jest.Mock<MockQuery, [string, unknown]>;
    in: jest.Mock<MockQuery, [string, unknown]>;
    lte: jest.Mock<MockQuery, [string, unknown]>;
    neq: jest.Mock<MockQuery, [string, unknown]>;
    order: jest.Mock<MockQuery, [string]>;
    overlaps: jest.Mock<MockQuery, [string, unknown]>;
    range: jest.Mock<
      Promise<{ data: ExpenseRecord[]; error: null }>,
      [number, number]
    >;
  };

  function makeQuery(): MockQuery {
    const query: MockQuery = {
      eq: jest.fn((column: string, value: unknown) => {
        calls.push(['eq', column, value]);
        return query;
      }),
      gte: jest.fn((column: string, value: unknown) => {
        calls.push(['gte', column, value]);
        return query;
      }),
      in: jest.fn((column: string, value: unknown) => {
        calls.push(['in', column, value]);
        return query;
      }),
      lte: jest.fn((column: string, value: unknown) => {
        calls.push(['lte', column, value]);
        return query;
      }),
      neq: jest.fn((column: string, value: unknown) => {
        calls.push(['neq', column, value]);
        return query;
      }),
      order: jest.fn((column: string) => {
        calls.push(['order', column]);
        return query;
      }),
      overlaps: jest.fn((column: string, value: unknown) => {
        calls.push(['overlaps', column, value]);
        return query;
      }),
      range: jest.fn((from: number, to: number) => {
        calls.push(['range', from, to]);
        const data = pages[rangeCalls] ?? [];
        rangeCalls += 1;
        return Promise.resolve({ data, error: null });
      }),
    };
    return query;
  }

  return {
    calls,
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => makeQuery()),
      })),
    },
  };
}

function authContext() {
  return {
    accessToken: 'token',
    supabaseAnonKey: 'anon',
    supabaseUrl: 'http://127.0.0.1:54321',
    userId: 'user-1',
  };
}

function expense(
  input: Partial<ExpenseRecord> & { id: string },
): ExpenseRecord {
  return {
    id: input.id,
    household_id: input.household_id ?? 'household-1',
    user_id: input.user_id ?? 'user-1',
    chat_message_id: `message-${input.id}`,
    amount_cents: input.amount_cents ?? 0,
    currency: 'USD',
    expense_date: input.expense_date ?? '2026-05-01',
    merchant: input.merchant ?? null,
    category: input.category ?? 'groceries',
    note: input.note ?? null,
    created_at: `${input.expense_date ?? '2026-05-01'}T12:00:00.000Z`,
    tags: input.tags ?? [],
  };
}
