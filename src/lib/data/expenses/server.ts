import 'server-only';

import {
  getExpensesByMessageId as getExpensesByMessageIdAction,
  updateExpenses as updateExpensesAction,
} from '@actions/expenses';

import type { GetExpensesByMessageId, UpdateExpenses } from './types';

export const getExpensesByMessageId: GetExpensesByMessageId = async input =>
  getExpensesByMessageIdAction(input);

export const updateExpenses: UpdateExpenses = async input => {
  'use server';

  return updateExpensesAction(input);
};
