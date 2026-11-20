import {
  getExpensesByMessageId as getExpensesByMessageIdAction,
  getExpensesByMessageIds as getExpensesByMessageIdsAction,
  updateExpenses as updateExpensesAction,
} from '@actions/expenses';

import {
  getExpensesByMessageId,
  getExpensesByMessageIds,
  updateExpenses,
} from './client';

jest.mock('@actions/expenses', () => ({
  getExpensesByMessageId: jest.fn(),
  getExpensesByMessageIds: jest.fn(),
  updateExpenses: jest.fn(),
}));

describe('data/expenses/client facade', () => {
  const getExpensesByMessageIdMock = jest.mocked(getExpensesByMessageIdAction);
  const updateExpensesMock = jest.mocked(updateExpensesAction);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates expense reads by message id', async () => {
    const payload = { messageId: 'message-1' };
    const result = { expenses: [] };
    getExpensesByMessageIdMock.mockResolvedValue(result);

    const actual = await getExpensesByMessageId(payload);

    expect(getExpensesByMessageIdMock).toHaveBeenCalledWith(payload);
    expect(actual).toEqual(result);
  });

  it('delegates batched expense reads', async () => {
    const getManyMock = jest.mocked(getExpensesByMessageIdsAction);
    const payload = { messageIds: ['message-1', 'message-2'] };
    const result = {
      expensesByMessageId: { 'message-1': [], 'message-2': [] },
    };
    getManyMock.mockResolvedValue(result);

    const actual = await getExpensesByMessageIds(payload);

    expect(getManyMock).toHaveBeenCalledWith(payload);
    expect(actual).toEqual(result);
  });

  it('delegates expense updates', async () => {
    const payload = {
      updates: [
        {
          id: 'expense-1',
          amount: '12.50',
          expense_date: '2026-03-17',
          category: 'groceries' as const,
          merchant: 'Store',
          currency: 'USD',
        },
      ],
      messageId: 'message-1',
    };
    const result = { updatedIds: ['expense-1'] };
    updateExpensesMock.mockResolvedValue(result);

    const actual = await updateExpenses(payload);

    expect(updateExpensesMock).toHaveBeenCalledWith(payload);
    expect(actual).toEqual(result);
  });
});
