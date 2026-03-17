import {
  getExpensesByMessageId as getExpensesByMessageIdAction,
  updateExpenses as updateExpensesAction,
} from '@actions/expenses';

import { getExpensesByMessageId, updateExpenses } from './client';

jest.mock('@actions/expenses', () => ({
  getExpensesByMessageId: jest.fn(),
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
