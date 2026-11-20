import {
  getExpensesByMessageId as getExpensesByMessageIdAction,
  getExpensesByMessageIds as getExpensesByMessageIdsAction,
  updateExpenses as updateExpensesAction,
} from '@actions/expenses';

import type {
  GetExpensesByMessageId,
  GetExpensesByMessageIds,
  UpdateExpenses,
} from './types';

export const getExpensesByMessageId: GetExpensesByMessageId = async input =>
  getExpensesByMessageIdAction(input);

export const getExpensesByMessageIds: GetExpensesByMessageIds = async input =>
  getExpensesByMessageIdsAction(input);

export const updateExpenses: UpdateExpenses = async input =>
  updateExpensesAction(input);
