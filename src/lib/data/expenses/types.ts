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

export type GetExpensesByMessageIdsInput = {
  messageIds: string[];
};

export type GetExpensesByMessageIdsResult = {
  /** Every requested id is present, with `[]` when it has no lines. */
  expensesByMessageId: Record<string, ExpenseRecord[]>;
  errorCode?: 'auth_required' | 'expenses_fetch_failed';
};

export type UpdateExpensesInput = {
  updates: ExpenseUpdateInput[];
  messageId?: string | null;
};

export type GetExpensesByMessageId = (
  input: GetExpensesByMessageIdInput,
) => Promise<GetExpensesByMessageIdResult>;

/** Lines for up to 100 messages in one call (callers chunk above that). */
export type GetExpensesByMessageIds = (
  input: GetExpensesByMessageIdsInput,
) => Promise<GetExpensesByMessageIdsResult>;

export type UpdateExpenses = (
  input: UpdateExpensesInput,
) => Promise<UpdateExpensesResult>;
