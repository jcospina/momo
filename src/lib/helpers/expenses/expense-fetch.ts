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
