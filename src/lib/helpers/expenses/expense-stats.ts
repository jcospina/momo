import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  DailyTotalsByMonthRow,
  MonthlyByCategoryUserRow,
} from '@lib-types/expense-stats';

type ViewFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
  months: string[];
};

export async function fetchMonthlyByCategoryUser({
  supabase,
  householdId,
  months,
}: ViewFetchParams): Promise<MonthlyByCategoryUserRow[]> {
  if (!months.length) {
    return [];
  }

  const query = supabase
    .from('monthly_by_category_user')
    .select('household_id, month, category, user_label, total_cents')
    .in('month', months);

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query.order('month', { ascending: true });

  if (error) {
    console.error('fetchMonthlyByCategoryUser failed', error);
    return [];
  }

  return (data as MonthlyByCategoryUserRow[]) ?? [];
}

export async function fetchDailyTotalsByMonth({
  supabase,
  householdId,
  months,
}: ViewFetchParams): Promise<DailyTotalsByMonthRow[]> {
  if (!months.length) {
    return [];
  }

  const query = supabase
    .from('daily_totals_by_month')
    .select('household_id, month, day, total_cents, cumulative_cents')
    .in('month', months);

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query
    .order('month', { ascending: true })
    .order('day', { ascending: true });

  if (error) {
    console.error('fetchDailyTotalsByMonth failed', error);
    return [];
  }

  return (data as DailyTotalsByMonthRow[]) ?? [];
}
