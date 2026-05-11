import type { ExpenseRecord } from '@lib-types/expenses';
import type { GetSpendingStatsResult } from '@/agent/types';
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

  it('calls the stats RPC with exact arbitrary date bounds and filters', async () => {
    const { from, rpc, supabase } = mockSupabaseRpc(
      statsResult({
        groupBy: 'tag',
        groups: [
          {
            label: 'car repair',
            amountCents: 12000,
            transactionCount: 2,
            percentageOfTotal: 100,
          },
        ],
        totalExpenseCents: 12000,
        transactionCount: 2,
      }),
    );
    createAgentSupabaseClientMock.mockReturnValue(supabase as never);

    const result = await getSpendingStats(
      {
        scope: 'personal',
        startDate: '2026-03-17',
        endDate: '2026-04-07',
        categories: ['vehicle'],
        merchants: ['Car Shop'],
        tags: ['car repair'],
        includeIncome: null,
        groupBy: 'tag',
        limit: 12,
      },
      { currency: 'USD', auth: authContext() },
    );

    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('get_agent_spending_stats', {
      p_categories: ['vehicle'],
      p_currency: 'USD',
      p_end_date: '2026-04-07',
      p_group_by: 'tag',
      p_household_id: null,
      p_include_income: false,
      p_limit: 12,
      p_merchants: ['Car Shop'],
      p_scope: 'personal',
      p_start_date: '2026-03-17',
      p_tags: ['car repair'],
    });
    expect(result).toMatchObject({
      groupBy: 'tag',
      groups: [
        {
          amountCents: 12000,
          label: 'car repair',
          percentageOfTotal: 100,
          transactionCount: 2,
        },
      ],
      totalExpenseCents: 12000,
      transactionCount: 2,
    });
  });

  it('passes includeIncome through to the stats RPC only when requested', async () => {
    const { rpc, supabase } = mockSupabaseRpc(
      statsResult({
        netCents: 2000,
        totalExpenseCents: 1000,
        totalIncomeCents: 3000,
      }),
    );
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

    expect(rpc).toHaveBeenCalledWith(
      'get_agent_spending_stats',
      expect.objectContaining({
        p_include_income: true,
      }),
    );
    expect(result.totalExpenseCents).toBe(1000);
    expect(result.totalIncomeCents).toBe(3000);
    expect(result.netCents).toBe(2000);
  });

  it('resolves household membership before calling the stats RPC', async () => {
    const { rpc, supabase } = mockSupabaseRpc(statsResult(), {
      householdId: 'household-1',
    });
    createAgentSupabaseClientMock.mockReturnValue(supabase as never);

    await getSpendingStats(
      {
        scope: 'household',
        startDate: null,
        endDate: null,
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: false,
        groupBy: null,
        limit: null,
      },
      { currency: 'USD', auth: authContext() },
    );

    expect(rpc).toHaveBeenCalledWith(
      'get_agent_spending_stats',
      expect.objectContaining({
        p_household_id: 'household-1',
        p_scope: 'household',
      }),
    );
  });

  it('returns empty household stats without an RPC call when no household is visible', async () => {
    const { rpc, supabase } = mockSupabaseRpc(statsResult(), {
      householdId: null,
    });
    createAgentSupabaseClientMock.mockReturnValue(supabase as never);

    const result = await getSpendingStats(
      {
        scope: 'household',
        startDate: '2026-01-01',
        endDate: null,
        categories: null,
        merchants: null,
        tags: null,
        includeIncome: false,
        groupBy: 'category',
        limit: null,
      },
      { currency: 'USD', auth: authContext() },
    );

    expect(rpc).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      groupBy: 'category',
      groups: [],
      startDate: '2026-01-01',
      totalExpenseCents: 0,
      transactionCount: 0,
    });
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

function mockSupabaseRpc(
  data: GetSpendingStatsResult,
  options: { householdId?: string | null } = {},
) {
  const rpc = jest.fn(() => Promise.resolve({ data, error: null }));
  const householdId = options.householdId;

  type MembershipQuery = {
    eq: jest.Mock<MembershipQuery, [string, unknown]>;
    limit: jest.Mock<MembershipQuery, [number]>;
    maybeSingle: jest.Mock<
      Promise<{ data: { household_id: string } | null; error: null }>,
      []
    >;
  };

  const membershipQuery: MembershipQuery = {
    eq: jest.fn((_column: string, _value: unknown) => membershipQuery),
    limit: jest.fn((_count: number) => membershipQuery),
    maybeSingle: jest.fn(() =>
      Promise.resolve({
        data:
          householdId === undefined || householdId === null
            ? null
            : { household_id: householdId },
        error: null,
      }),
    ),
  };

  const from = jest.fn((table: string) => {
    if (table !== 'household_members') {
      throw new Error(`Unexpected table ${table}`);
    }
    return {
      select: jest.fn(() => membershipQuery),
    };
  });

  return {
    from,
    rpc,
    supabase: {
      from,
      rpc,
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

function statsResult(
  input: Partial<GetSpendingStatsResult> = {},
): GetSpendingStatsResult {
  return {
    currency: input.currency ?? 'USD',
    scope: input.scope ?? 'personal',
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    totalExpenseCents: input.totalExpenseCents ?? 0,
    totalIncomeCents: input.totalIncomeCents ?? 0,
    netCents: input.netCents ?? 0,
    savingsRate: input.savingsRate ?? null,
    savingsRateBasis: input.savingsRateBasis ?? 'unavailable_zero_income',
    transactionCount: input.transactionCount ?? 0,
    groupBy: input.groupBy ?? null,
    groups: input.groups ?? null,
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
