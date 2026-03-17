import type {
  ExpenseRecord,
  ExpenseUpdateInput,
  UpdateExpensesResult,
} from '@lib-types/expenses';

export type GetExpensesByMessageIdInput = {
  messageId: string;
};

export type GetExpensesByMessageIdResult = {
  expenses: ExpenseRecord[];
};

export type UpdateExpensesInput = {
  updates: ExpenseUpdateInput[];
  messageId?: string | null;
};

export type GetExpensesByMessageId = (
  input: GetExpensesByMessageIdInput,
) => Promise<GetExpensesByMessageIdResult>;

export type UpdateExpenses = (
  input: UpdateExpensesInput,
) => Promise<UpdateExpensesResult>;
