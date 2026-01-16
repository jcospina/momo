import { createSupabaseServerClient } from '@lib-supabase/server';
import type { ChatMessage, ChatMessageStatus } from '@lib-types/chat';
import type { ParsedEntry } from '@lib-types/expenses';

type PersistResult = {
  expenseIds: string[];
};

type ExpenseInsertRow = {
  household_id: string | null;
  user_id: string;
  chat_message_id: string;
  amount_cents: number;
  currency: string;
  expense_date: string;
  note: string;
  tags: string[];
  category?: string;
};

function formatExpenseDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildExpenseRows(
  message: ChatMessage,
  entries: ParsedEntry[],
  date: Date,
): ExpenseInsertRow[] {
  const expenseDate = formatExpenseDate(date);
  return entries.map(entry => {
    const row: ExpenseInsertRow = {
      household_id: message.household_id,
      user_id: message.user_id,
      chat_message_id: message.id,
      amount_cents: entry.amount_minor,
      currency: entry.currency,
      expense_date: expenseDate,
      note: entry.raw,
      tags: entry.tags ?? [],
    };
    if (entry.category) {
      row.category = entry.category;
    }
    return row;
  });
}

export async function updateMessageStatus(
  messageId: string,
  status: ChatMessageStatus,
) {
  const client = await createSupabaseServerClient();
  return client.from('chat_messages').update({ status }).eq('id', messageId);
}

export async function persistParsedExpenses(
  message: ChatMessage,
  entries: ParsedEntry[],
  status?: ChatMessageStatus,
): Promise<PersistResult | null> {
  if (!entries.length) {
    return { expenseIds: [] };
  }

  const supabase = await createSupabaseServerClient();
  const expenseRows = buildExpenseRows(message, entries, new Date());

  const { data, error } = await supabase
    .from('expenses')
    .insert(expenseRows)
    .select('id');

  if (error) {
    console.error('[expenses] insert failed');
    await updateMessageStatus(message.id, 'failed');
    return null;
  }

  const expenseIds = (data ?? []).map(row => row.id as string);
  const nextStatus = status ?? 'processed';
  const { error: updateError } = await supabase
    .from('chat_messages')
    .update({ status: nextStatus, expense_count: expenseRows.length })
    .eq('id', message.id);

  if (updateError) {
    console.error('[chat] status update failed');
    await updateMessageStatus(message.id, 'failed');
    return null;
  }

  return { expenseIds };
}
