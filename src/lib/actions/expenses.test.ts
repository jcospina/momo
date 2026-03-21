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

function createSupabaseMock() {
  const eqBuilder = {
    eq: jest.fn().mockReturnThis(),
  };

  const chatMessagesBuilder = {
    update: jest.fn().mockReturnValue(eqBuilder),
  };

  const from = jest.fn((table: string) => {
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
});
