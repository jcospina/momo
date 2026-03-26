import {
  fetchAllMonthlyByCategoryUser,
  fetchAllMonthlyCashflowNet,
  fetchAllPersonalRollupMonthlyByCategoryUser,
  fetchAllPersonalRollupMonthlyCashflowNet,
  fetchDailyTotalsByMonth,
  fetchMonthlyBoundsByCategoryUser,
  fetchMonthlyByCategoryUser,
  fetchPersonalRollupDailyTotalsByMonth,
  fetchPersonalRollupMonthlyBoundsByCategoryUser,
  fetchPersonalRollupMonthlyByCategoryUser,
} from '@helpers/expenses-stats';
import type {
  DailyTotalsByMonthRow,
  MonthlyByCategoryUserRow,
  MonthlyCashflowNetRow,
} from '@lib-types/expense-stats';
import type { ScopedContext } from './scope';

export async function readMonthlyByCategoryRows({
  context,
  months,
}: {
  context: ScopedContext;
  months: string[];
}): Promise<MonthlyByCategoryUserRow[]> {
  if (context.scope === 'personal') {
    return fetchPersonalRollupMonthlyByCategoryUser({
      supabase: context.supabase,
      userId: context.userId,
      months,
    });
  }

  return fetchMonthlyByCategoryUser({
    supabase: context.supabase,
    householdId: context.householdId,
    months,
  });
}

export async function readAllMonthlyByCategoryRows({
  context,
}: {
  context: ScopedContext;
}): Promise<MonthlyByCategoryUserRow[]> {
  if (context.scope === 'personal') {
    return fetchAllPersonalRollupMonthlyByCategoryUser({
      supabase: context.supabase,
      userId: context.userId,
    });
  }

  return fetchAllMonthlyByCategoryUser({
    supabase: context.supabase,
    householdId: context.householdId,
  });
}

export async function readDailyTotalsRows({
  context,
  months,
}: {
  context: ScopedContext;
  months: string[];
}): Promise<DailyTotalsByMonthRow[]> {
  if (context.scope === 'personal') {
    return fetchPersonalRollupDailyTotalsByMonth({
      supabase: context.supabase,
      userId: context.userId,
      months,
    });
  }

  return fetchDailyTotalsByMonth({
    supabase: context.supabase,
    householdId: context.householdId,
    months,
  });
}

export async function readAllMonthlyCashflowRows({
  context,
}: {
  context: ScopedContext;
}): Promise<MonthlyCashflowNetRow[]> {
  if (context.scope === 'personal') {
    return fetchAllPersonalRollupMonthlyCashflowNet({
      supabase: context.supabase,
      userId: context.userId,
    });
  }

  return fetchAllMonthlyCashflowNet({
    supabase: context.supabase,
    householdId: context.householdId,
  });
}

export async function readMonthlyBounds({
  context,
}: {
  context: ScopedContext;
}): Promise<{ earliestMonth: string | null; latestMonth: string | null }> {
  if (context.scope === 'personal') {
    return fetchPersonalRollupMonthlyBoundsByCategoryUser({
      supabase: context.supabase,
      userId: context.userId,
    });
  }

  return fetchMonthlyBoundsByCategoryUser({
    supabase: context.supabase,
    householdId: context.householdId,
  });
}
