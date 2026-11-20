import { AppNavbar } from '@components/navbar/app-navbar';
import { ExpenseScopePanels } from '@components/stats/expense-scope-panels';
import { format } from 'date-fns';
import type { ComponentProps } from 'react';
import { requireProfile } from '@/app/home/session';
import { getUserPreferences } from '@/lib/data/prefs/server';
import {
  getCumulativeSavingsData,
  getDailyComparisonData,
  getMonthlyHistory,
  getMonthlyIncomeVsExpenseData,
} from '@/lib/data/stats/server';

function emptyDailyComparison(currentMonth: string) {
  return {
    data: {
      currentMonth,
      previousMonth: currentMonth,
      current: [],
      previous: [],
    },
    errorCode: 'no_household' as const,
  };
}

export type StatsData = ComponentProps<typeof ExpenseScopePanels>;

/** Every stats panel's data for the user, read in one parallel batch. */
export async function loadStats(userId: string): Promise<StatsData> {
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Every query starts at once. The household daily comparison used to wait
  // for the household history to say whether a household exists; it now
  // runs alongside it and is dropped when there is none.
  const [
    _profile, // awaited so a missing profile redirects before rendering
    prefs,
    personalMonthly,
    householdMonthly,
    personalDaily,
    householdDailyResult,
    personalIncomeVsExpense,
    personalCumulativeSavings,
  ] = await Promise.all([
    requireProfile(userId),
    getUserPreferences(userId),
    getMonthlyHistory({ scope: 'personal' }),
    getMonthlyHistory({ scope: 'household' }),
    getDailyComparisonData({ currentMonth, scope: 'personal' }),
    getDailyComparisonData({ currentMonth, scope: 'household' }),
    getMonthlyIncomeVsExpenseData({ scope: 'personal' }),
    getCumulativeSavingsData({ scope: 'personal' }),
  ]);

  const householdAvailable = householdMonthly.errorCode !== 'no_household';
  const householdDaily = householdAvailable
    ? householdDailyResult
    : emptyDailyComparison(currentMonth);
  const currency = prefs?.currency ?? 'USD';

  return {
    currency,
    householdAvailable,
    personal: {
      months: personalMonthly.data.months,
      rows: personalMonthly.data.rows,
      daily: personalDaily.data,
      cashflow: {
        monthlyIncomeVsExpense: personalIncomeVsExpense.data.months,
        cumulativeSavings: personalCumulativeSavings.data.months,
      },
    },
    household: {
      months: householdMonthly.data.months,
      rows: householdMonthly.data.rows,
      daily: householdDaily.data,
      cashflow: {
        monthlyIncomeVsExpense: [],
        cumulativeSavings: [],
      },
    },
  };
}

type StatsContentProps = {
  /** The stats load, started by the page before it renders the skeleton. */
  stats: Promise<StatsData>;
};

/** The navbar and every stats panel, rendered once all their data is in. */
export async function StatsContent({ stats }: StatsContentProps) {
  const data = await stats;

  return (
    <>
      <AppNavbar />
      <ExpenseScopePanels {...data} />
    </>
  );
}
