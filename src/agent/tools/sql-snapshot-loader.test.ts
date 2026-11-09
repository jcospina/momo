import type { AgentContext } from '@/agent/context';
import { loadSqlExpenseSnapshot } from './sql-snapshot-loader';
import type { SqlExpenseRow } from './sql-types';
import { createAgentSupabaseClient } from './supabase-client';

jest.mock('./supabase-client', () => ({
  createAgentSupabaseClient: jest.fn(),
}));

const context: AgentContext = {
  currency: 'USD',
  auth: {
    userId: 'owner',
    accessToken: 'token',
    supabaseUrl: 'http://localhost',
    supabaseAnonKey: 'anon',
  },
};

function expense(
  index = 0,
  overrides: Partial<SqlExpenseRow> = {},
): SqlExpenseRow {
  return {
    id: String(index).padStart(8, '0'),
    user_id: 'owner',
    household_id: 'home',
    amount_cents: 123,
    currency: 'USD',
    expense_date: '2026-01-01',
    merchant: null,
    category: 'food',
    note: 'Lunch',
    tags: [],
    ...overrides,
  };
}

function mockClient(
  pages: Array<{ data: SqlExpenseRow[] | null; error: unknown }>,
  membership = {
    data: { household_id: 'home' } as { household_id: string } | null,
    error: null as unknown,
  },
) {
  const calls: unknown[][] = [];
  const from = jest.fn((table: string) => {
    calls.push(['from', table]);
    const query = {
      select: (columns: string) => {
        calls.push([table, 'select', columns]);
        return query;
      },
      eq: (column: string, value: unknown) => {
        calls.push([table, 'eq', column, value]);
        return query;
      },
      gt: (column: string, value: unknown) => {
        calls.push([table, 'gt', column, value]);
        return query;
      },
      order: (column: string, options: unknown) => {
        calls.push([table, 'order', column, options]);
        return query;
      },
      limit: () => query,
      maybeSingle: async () => membership,
      range: async (start: number, end: number) => {
        calls.push([table, 'range', start, end]);
        return pages.shift() ?? { data: [], error: null };
      },
    };
    return query;
  });
  jest.mocked(createAgentSupabaseClient).mockReturnValue({ from } as never);
  return calls;
}

describe('SQL expense snapshot authorization and completeness', () => {
  it('requires authentication before creating a client', async () => {
    await expect(
      loadSqlExpenseSnapshot({ currency: 'USD' }, 'personal'),
    ).rejects.toThrow('Authentication');
    expect(createAgentSupabaseClient).not.toHaveBeenCalled();
  });

  it('uses the caller token and explicit personal/currency filters, including income', async () => {
    const row = expense(0, { category: 'income' });
    const calls = mockClient([{ data: [row], error: null }]);
    await expect(loadSqlExpenseSnapshot(context, 'personal')).resolves.toEqual([
      row,
    ]);
    expect(createAgentSupabaseClient).toHaveBeenCalledWith(context.auth);
    expect(calls).toEqual(
      expect.arrayContaining([
        ['expenses', 'eq', 'currency', 'USD'],
        ['expenses', 'eq', 'user_id', 'owner'],
        ['expenses', 'order', 'id', { ascending: true }],
      ]),
    );
    expect(calls).not.toContainEqual(['from', 'household_members']);
  });

  it('verifies selected household membership and includes other shared members', async () => {
    const row = expense(0, { user_id: 'member' });
    const calls = mockClient([{ data: [row], error: null }]);
    await expect(
      loadSqlExpenseSnapshot({ ...context, householdId: 'home' }, 'household'),
    ).resolves.toEqual([row]);
    expect(calls).toEqual(
      expect.arrayContaining([
        ['household_members', 'eq', 'user_id', 'owner'],
        ['household_members', 'eq', 'household_id', 'home'],
        ['expenses', 'eq', 'household_id', 'home'],
      ]),
    );
    expect(calls).not.toContainEqual(['expenses', 'eq', 'user_id', 'owner']);
  });

  it('returns empty for no household and never queries expenses', async () => {
    const calls = mockClient([], { data: null, error: null });
    await expect(loadSqlExpenseSnapshot(context, 'household')).resolves.toEqual(
      [],
    );
    expect(calls).not.toContainEqual(['from', 'expenses']);
  });

  it('respects an explicitly absent selected household', async () => {
    const calls = mockClient([]);
    await expect(
      loadSqlExpenseSnapshot({ ...context, householdId: null }, 'household'),
    ).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });

  it('refuses an inaccessible selected household', async () => {
    const calls = mockClient([], { data: null, error: null });
    await expect(
      loadSqlExpenseSnapshot({ ...context, householdId: 'other' }, 'household'),
    ).rejects.toThrow('Household access');
    expect(calls).not.toContainEqual(['from', 'expenses']);
  });

  it('does not turn a membership failure into empty data', async () => {
    mockClient([], {
      data: null,
      error: { message: 'private transport details' },
    });
    await expect(loadSqlExpenseSnapshot(context, 'household')).rejects.toThrow(
      'Unable to verify household access.',
    );
  });

  it('uses stable keyset pagination across pages', async () => {
    const first = Array.from({ length: 1000 }, (_, index) => expense(index));
    const last = expense(1000);
    const calls = mockClient([
      { data: first, error: null },
      { data: [last], error: null },
    ]);
    await expect(
      loadSqlExpenseSnapshot(context, 'personal'),
    ).resolves.toHaveLength(1001);
    expect(calls).toContainEqual(['expenses', 'gt', 'id', first[999].id]);
    expect(calls.filter(call => call[1] === 'range')).toEqual([
      ['expenses', 'range', 0, 999],
      ['expenses', 'range', 0, 999],
    ]);
  });

  it('throws away partial results if a later page fails', async () => {
    mockClient([
      {
        data: Array.from({ length: 1000 }, (_, index) => expense(index)),
        error: null,
      },
      { data: null, error: { message: 'transport details' } },
    ]);
    await expect(loadSqlExpenseSnapshot(context, 'personal')).rejects.toThrow(
      'Unable to load expense data.',
    );
  });

  it.each([
    { user_id: 'someone-else' },
    { currency: 'EUR' },
  ])('rejects a response outside personal scope: %p', async overrides => {
    mockClient([{ data: [expense(0, overrides)], error: null }]);
    await expect(loadSqlExpenseSnapshot(context, 'personal')).rejects.toThrow(
      'authorized scope',
    );
  });

  it('rejects oversized histories rather than returning a partial ledger', async () => {
    mockClient(
      Array.from({ length: 21 }, (_, page) => ({
        data: Array.from({ length: 1000 }, (_, index) =>
          expense(page * 1000 + index),
        ),
        error: null,
      })),
    );
    await expect(loadSqlExpenseSnapshot(context, 'personal')).rejects.toThrow(
      'snapshot size',
    );
  });

  it('accepts exactly the row limit after checking for another page', async () => {
    const calls = mockClient(
      Array.from({ length: 20 }, (_, page) => ({
        data: Array.from({ length: 1000 }, (_, index) =>
          expense(page * 1000 + index),
        ),
        error: null,
      })),
    );
    await expect(
      loadSqlExpenseSnapshot(context, 'personal'),
    ).resolves.toHaveLength(20_000);
    expect(calls.filter(call => call[1] === 'range')).toHaveLength(21);
  });

  it('refuses duplicate rows instead of double-counting them', async () => {
    mockClient([{ data: [expense(), expense()], error: null }]);
    await expect(loadSqlExpenseSnapshot(context, 'personal')).rejects.toThrow(
      'authorized scope',
    );
  });

  it('rejects household response rows from another household', async () => {
    mockClient([
      { data: [expense(0, { household_id: 'another-home' })], error: null },
    ]);
    await expect(loadSqlExpenseSnapshot(context, 'household')).rejects.toThrow(
      'authorized scope',
    );
  });

  it('rejects oversized text payloads', async () => {
    mockClient([
      {
        data: [expense(0, { note: 'x'.repeat(8 * 1024 * 1024) })],
        error: null,
      },
    ]);
    await expect(loadSqlExpenseSnapshot(context, 'personal')).rejects.toThrow(
      'snapshot size',
    );
  });
});
