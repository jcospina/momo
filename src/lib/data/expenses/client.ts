import {
  getExpensesByMessageId as getExpensesByMessageIdAction,
  updateExpenses as updateExpensesAction,
} from '@actions/expenses';

import type { GetExpensesByMessageId, UpdateExpenses } from './types';

export const getExpensesByMessageId: GetExpensesByMessageId = async input =>
  getExpensesByMessageIdAction(input);

export const updateExpenses: UpdateExpenses = async input =>
  updateExpensesAction(input);
