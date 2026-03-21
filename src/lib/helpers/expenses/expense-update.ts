import type { SupabaseClient } from '@supabase/supabase-js';

type ExpenseUpdateRow = {
  id: string;
  amount_cents: number;
  expense_date: string;
  category: string | null;
  merchant: string | null;
  note?: string | null;
};

type UpdateExpensesParams = {
  supabase: SupabaseClient;
  updates: ExpenseUpdateRow[];
};

type UpdateExpensesResult = {
  updatedIds: string[];
  error?: string;
};

export async function updateExpenses({
  supabase,
  updates,
}: UpdateExpensesParams): Promise<UpdateExpensesResult> {
  if (!updates.length) {
    return { updatedIds: [] };
  }

  const results = await Promise.all(
    updates.map(async update => {
      const payload: {
        amount_cents: number;
        expense_date: string;
        category: string | null;
        merchant: string | null;
        note?: string | null;
      } = {
        amount_cents: update.amount_cents,
        expense_date: update.expense_date,
        category: update.category,
        merchant: update.merchant,
      };

      if (update.note !== undefined) {
        payload.note = update.note;
      }

      const { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', update.id)
        .select('id')
        .single();

      if (error || !data) {
        return { id: update.id, error: true };
      }

      return { id: data.id as string, error: false };
    }),
  );

  const updatedIds = results.filter(r => !r.error).map(r => r.id);
  const hasError = results.some(r => r.error);

  if (hasError) {
    return { updatedIds, error: 'expense_update_failed' };
  }

  return { updatedIds };
}
