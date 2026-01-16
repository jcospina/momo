'use server';

import { AMOUNT_REGEX, MULTIPLIERS } from '@constants/expenses/amounts';
import { fetchExpensesByMessageId } from '@helpers/expenses/expense-fetch';
import { updateExpenses as updateExpenseRows } from '@helpers/expenses/expense-update';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type {
  ExpenseRecord,
  ExpenseUpdateInput,
  UpdateExpensesResult,
} from '@lib-types/expenses';

type GetExpensesByMessageIdInput = {
  messageId: string;
};

type GetExpensesByMessageIdResult = {
  expenses: ExpenseRecord[];
};

export async function getExpensesByMessageId({
  messageId,
}: GetExpensesByMessageIdInput): Promise<GetExpensesByMessageIdResult> {
  const trimmed = messageId?.trim();
  if (!trimmed) {
    return { expenses: [] };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { expenses: [] };
  }

  const expenses = await fetchExpensesByMessageId({
    supabase,
    messageId: trimmed,
  });

  return { expenses };
}

type UpdateExpensesInput = {
  updates: ExpenseUpdateInput[];
  messageId?: string | null;
};

function toMinorUnits(value: number, currency: string) {
  if (currency === 'COP') {
    return Math.round(value);
  }
  return Math.round(value * 100);
}

function parseAmountInput(amount: string, currency: string): number | null {
  const trimmed = amount?.trim?.() ?? '';
  const match = trimmed.match(AMOUNT_REGEX);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const suffix = match[2] ? match[2].toLowerCase() : null;
  const multiplier = suffix ? (MULTIPLIERS[suffix] ?? 1) : 1;
  const amountMinor = toMinorUnits(value * multiplier, currency);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return null;
  return amountMinor;
}

export async function updateExpenses({
  updates,
  messageId = null,
}: UpdateExpensesInput): Promise<UpdateExpensesResult> {
  if (!updates?.length) {
    return { updatedIds: [] };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { errorCode: 'auth_required' };
  }

  const parsedUpdates = updates.map(update => {
    const amountCents = parseAmountInput(update.amount, update.currency);
    if (amountCents === null) {
      return { error: 'expense_amount_invalid' as const };
    }
    return {
      id: update.id,
      amount_cents: amountCents,
      expense_date: update.expense_date,
      category: update.category ?? null,
      merchant: update.merchant?.trim() || null,
    };
  });

  if (parsedUpdates.some(update => 'error' in update)) {
    return { errorCode: 'expense_amount_invalid' };
  }

  const { error } = await updateExpenseRows({
    supabase,
    updates: parsedUpdates as Array<{
      id: string;
      amount_cents: number;
      expense_date: string;
      category: string | null;
      merchant: string | null;
    }>,
  });

  if (error) {
    return { errorCode: 'expense_update_failed' };
  }

  const trimmedMessageId = messageId?.trim();
  if (trimmedMessageId) {
    const expenses = await fetchExpensesByMessageId({
      supabase,
      messageId: trimmedMessageId,
    });
    const needsCategory = expenses.some(expense => !expense.category);
    const nextStatus = needsCategory ? 'needs_category' : 'processed';
    await supabase
      .from('chat_messages')
      .update({ status: nextStatus })
      .eq('id', trimmedMessageId)
      .eq('user_id', user.id);
  }

  return {
    updatedIds: updates.map(update => update.id),
  };
}
