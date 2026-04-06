import { upsertCategoryRule } from '@helpers/expenses/category-rules';
import { fetchExpensesByMessageId } from '@helpers/expenses/expense-fetch';
import { updateExpenses as updateExpenseRows } from '@helpers/expenses/expense-update';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { updateExpenses } from './expenses';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@helpers/expenses/expense-fetch', () => ({
  fetchExpensesByMessageId: jest.fn(),
}));

jest.mock('@helpers/expenses/expense-update', () => ({
  updateExpenses: jest.fn(),
}));

jest.mock('@helpers/expenses/category-rules', () => ({
  upsertCategoryRule: jest.fn(),
}));

function createSupabaseMock() {
  const expensesSelectBuilder = {
    in: jest.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  };

  const expensesBuilder = {
    select: jest.fn().mockReturnValue(expensesSelectBuilder),
  };

  const eqBuilder = {
    eq: jest.fn().mockReturnThis(),
  };

  const chatMessagesBuilder = {
    update: jest.fn().mockReturnValue(eqBuilder),
  };

  const from = jest.fn((table: string) => {
    if (table === 'expenses') {
      return expensesBuilder;
    }
    if (table === 'chat_messages') {
      return chatMessagesBuilder;
    }
    throw new Error(`unexpected table: ${table}`);
  });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from,
    expensesBuilder,
    expensesSelectBuilder,
    chatMessagesBuilder,
    eqBuilder,
  };
}

describe('updateExpenses action', () => {
  const createSupabaseServerClientMock = jest.mocked(
    createSupabaseServerClient,
  );
  const updateExpenseRowsMock = jest.mocked(updateExpenseRows);
  const fetchExpensesByMessageIdMock = jest.mocked(fetchExpensesByMessageId);
  const upsertCategoryRuleMock = jest.mocked(upsertCategoryRule);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes optional income note and keeps processed status when all rows have category', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    updateExpenseRowsMock.mockResolvedValue({ updatedIds: ['expense-1'] });
    fetchExpensesByMessageIdMock.mockResolvedValue([
      {
        id: 'expense-1',
        household_id: null,
        user_id: 'user-1',
        chat_message_id: 'message-1',
        amount_cents: 100000,
        currency: 'USD',
        expense_date: '2026-03-20',
        merchant: 'Employer',
        category: 'income',
        note: 'salary',
        created_at: '2026-03-20T10:00:00.000Z',
        tags: [],
      },
    ]);

    const result = await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '1000',
          expense_date: '2026-03-20',
          category: 'income',
          merchant: ' Employer ',
          note: '  Salary payout ',
          currency: 'USD',
        },
      ],
      messageId: 'message-1',
    });

    expect(updateExpenseRowsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        updates: [
          {
            id: 'expense-1',
            amount_cents: 100000,
            expense_date: '2026-03-20',
            category: 'income',
            merchant: 'Employer',
            note: 'Salary payout',
          },
        ],
      }),
    );
    expect(supabase.chatMessagesBuilder.update).toHaveBeenCalledWith({
      status: 'processed',
    });
    expect(result).toEqual({ updatedIds: ['expense-1'] });
  });

  it('leaves note undefined when not provided and preserves needs_category status behavior', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    updateExpenseRowsMock.mockResolvedValue({ updatedIds: ['expense-1'] });
    fetchExpensesByMessageIdMock.mockResolvedValue([
      {
        id: 'expense-1',
        household_id: null,
        user_id: 'user-1',
        chat_message_id: 'message-1',
        amount_cents: 2500,
        currency: 'USD',
        expense_date: '2026-03-20',
        merchant: 'Taxi',
        category: null,
        note: null,
        created_at: '2026-03-20T10:00:00.000Z',
        tags: [],
      },
    ]);

    await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '25',
          expense_date: '2026-03-20',
          category: 'transportation',
          merchant: 'Taxi',
          currency: 'USD',
        },
      ],
      messageId: 'message-1',
    });

    expect(updateExpenseRowsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        updates: [
          expect.objectContaining({
            id: 'expense-1',
            note: undefined,
          }),
        ],
      }),
    );
    expect(supabase.chatMessagesBuilder.update).toHaveBeenCalledWith({
      status: 'needs_category',
    });
  });

  it('fetches categorized source snapshots before update and learns for household + personal from pre-update note text', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    supabase.expensesSelectBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'expense-1',
          note: 'Peluqueria Maria 30k',
          household_id: 'household-1',
        },
      ],
      error: null,
    });
    updateExpenseRowsMock.mockResolvedValue({ updatedIds: ['expense-1'] });

    const result = await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '30',
          expense_date: '2026-03-20',
          category: 'self_care',
          merchant: 'Peluqueria',
          note: 'Edited note',
          currency: 'USD',
        },
      ],
    });

    expect(supabase.expensesBuilder.select).toHaveBeenCalledWith(
      'id, note, household_id',
    );
    expect(supabase.expensesSelectBuilder.in).toHaveBeenCalledWith('id', [
      'expense-1',
    ]);
    expect(
      supabase.expensesSelectBuilder.in.mock.invocationCallOrder[0],
    ).toBeLessThan(updateExpenseRowsMock.mock.invocationCallOrder[0]);
    expect(upsertCategoryRuleMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'user-1',
        householdId: 'household-1',
        normalizedText: 'peluqueria maria',
        category: 'self_care',
      }),
    );
    expect(upsertCategoryRuleMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'user-1',
        householdId: null,
        normalizedText: 'peluqueria maria',
        category: 'self_care',
      }),
    );
    expect(upsertCategoryRuleMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ updatedIds: ['expense-1'] });
  });

  it('keeps learning non-blocking after successful update', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    supabase.expensesSelectBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'expense-1',
          note: 'Taxi 25',
          household_id: null,
        },
      ],
      error: null,
    });
    updateExpenseRowsMock.mockResolvedValue({ updatedIds: ['expense-1'] });
    upsertCategoryRuleMock.mockReturnValueOnce(
      new Promise(() => undefined) as Promise<void>,
    );

    const result = await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '25',
          expense_date: '2026-03-20',
          category: 'transportation',
          merchant: 'Taxi',
          currency: 'USD',
        },
      ],
    });

    expect(result).toEqual({ updatedIds: ['expense-1'] });
    expect(upsertCategoryRuleMock).toHaveBeenCalledTimes(1);
  });

  it('does not learn rules when the expense update fails', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    supabase.expensesSelectBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'expense-1',
          note: 'Taxi 25',
          household_id: null,
        },
      ],
      error: null,
    });
    updateExpenseRowsMock.mockResolvedValue({
      updatedIds: [],
      error: 'expense_update_failed',
    });

    const result = await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '25',
          expense_date: '2026-03-20',
          category: 'transportation',
          merchant: 'Taxi',
          currency: 'USD',
        },
      ],
    });

    expect(result).toEqual({ errorCode: 'expense_update_failed' });
    expect(upsertCategoryRuleMock).not.toHaveBeenCalled();
  });

  it('skips learning when there are no categorized updates', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    updateExpenseRowsMock.mockResolvedValue({ updatedIds: ['expense-1'] });

    const result = await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '25',
          expense_date: '2026-03-20',
          category: null,
          merchant: 'Taxi',
          currency: 'USD',
        },
      ],
    });

    expect(supabase.expensesBuilder.select).not.toHaveBeenCalled();
    expect(upsertCategoryRuleMock).not.toHaveBeenCalled();
    expect(result).toEqual({ updatedIds: ['expense-1'] });
  });

  it('learns only personal scope when source expense is personal', async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    supabase.expensesSelectBuilder.in.mockResolvedValueOnce({
      data: [
        {
          id: 'expense-1',
          note: 'Taxi 25',
          household_id: null,
        },
      ],
      error: null,
    });
    updateExpenseRowsMock.mockResolvedValue({ updatedIds: ['expense-1'] });

    await updateExpenses({
      updates: [
        {
          id: 'expense-1',
          amount: '25',
          expense_date: '2026-03-20',
          category: 'transportation',
          merchant: 'Taxi',
          currency: 'USD',
        },
      ],
    });

    expect(upsertCategoryRuleMock).toHaveBeenCalledTimes(1);
    expect(upsertCategoryRuleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        householdId: null,
        normalizedText: 'taxi',
        category: 'transportation',
      }),
    );
  });
});
