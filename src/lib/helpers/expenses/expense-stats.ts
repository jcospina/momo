import type {
  DailyTotalsByMonthRow,
  MonthlyByCategoryUserRow,
} from '@lib-types/expense-stats';
import type { SupabaseClient } from '@supabase/supabase-js';

type ViewFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
  months: string[];
};

type BoundsFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
};

type AllFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
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

export async function fetchAllMonthlyByCategoryUser({
  supabase,
  householdId,
}: AllFetchParams): Promise<MonthlyByCategoryUserRow[]> {
  const query = supabase
    .from('monthly_by_category_user')
    .select('household_id, month, category, user_label, total_cents')
    .order('month', { ascending: true });

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchAllMonthlyByCategoryUser failed', error);
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

export async function fetchMonthlyBoundsByCategoryUser({
  supabase,
  householdId,
}: BoundsFetchParams): Promise<{
  earliestMonth: string | null;
  latestMonth: string | null;
}> {
  const buildQuery = (ascending: boolean) => {
    const query = supabase
      .from('monthly_by_category_user')
      .select('month')
      .limit(1);

    if (householdId) {
      query.eq('household_id', householdId);
    } else {
      query.is('household_id', null);
    }

    return query.order('month', { ascending });
  };

  const [
    { data: earliestData, error: earliestError },
    { data: latestData, error: latestError },
  ] = await Promise.all([buildQuery(true), buildQuery(false)]);

  if (earliestError || latestError) {
    console.error('fetchMonthlyBoundsByCategoryUser failed', {
      earliestError,
      latestError,
    });
    return { earliestMonth: null, latestMonth: null };
  }

  const earliestMonth =
    (earliestData?.[0] as { month?: string } | undefined)?.month ?? null;
  const latestMonth =
    (latestData?.[0] as { month?: string } | undefined)?.month ?? null;

  return { earliestMonth, latestMonth };
}
