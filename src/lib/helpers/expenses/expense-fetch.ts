import type { ExpenseRecord } from '@lib-types/expenses';
import type { SupabaseClient } from '@supabase/supabase-js';

type FetchExpensesByMessageIdParams = {
  supabase: SupabaseClient;
  messageId: string;
};

const EXPENSE_DETAILS_SELECT =
  'id, household_id, user_id, chat_message_id, amount_cents, currency, expense_date, merchant, category, note, created_at, tags';

export async function fetchExpensesByMessageId({
  supabase,
  messageId,
}: FetchExpensesByMessageIdParams): Promise<ExpenseRecord[]> {
  const trimmed = messageId?.trim();
  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_DETAILS_SELECT)
    .eq('chat_message_id', trimmed)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchExpensesByMessageId failed', error);
    return [];
  }

  return (data as ExpenseRecord[]) ?? [];
}

type FetchExpensesByMessageIdsParams = {
  supabase: SupabaseClient;
  messageIds: string[];
};

export type ExpensesByMessageIdResult = {
  /** Every requested id is present, with `[]` when it has no lines. */
  expensesByMessageId: Record<string, ExpenseRecord[]>;
  failed: boolean;
};

/**
 * Lines for many chat messages in one query (`idx_expenses_chat_message_id`).
 * RLS decides visibility: household members see each other's lines. Ordered
 * by `created_at, id` so lines saved together keep a stable order.
 */
export async function fetchExpensesByMessageIds({
  supabase,
  messageIds,
}: FetchExpensesByMessageIdsParams): Promise<ExpensesByMessageIdResult> {
  const expensesByMessageId: Record<string, ExpenseRecord[]> = {};
  for (const id of messageIds) expensesByMessageId[id] = [];
  if (messageIds.length === 0) {
    return { expensesByMessageId, failed: false };
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_DETAILS_SELECT)
    .in('chat_message_id', messageIds)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('fetchExpensesByMessageIds failed', error);
    return { expensesByMessageId: {}, failed: true };
  }

  for (const expense of (data as ExpenseRecord[]) ?? []) {
    expensesByMessageId[expense.chat_message_id]?.push(expense);
  }
  return { expensesByMessageId, failed: false };
}
