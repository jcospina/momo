import { AppNavbar } from '@components/navbar/app-navbar';
import { ExpenseScopePanels } from '@components/stats/expense-scope-panels';
import { Flex } from '@ui/flex/flex';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/auth/server';
import { getUserPreferences } from '@/lib/data/prefs/server';
import {
  getCumulativeSavingsData,
  getDailyComparisonData,
  getMonthlyHistory,
  getMonthlyIncomeVsExpenseData,
} from '@/lib/data/stats/server';

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const currentMonth = format(new Date(), 'yyyy-MM');

  // Kick off every query that doesn't depend on household availability up
  // front so they run concurrently. Previously these ran as three sequential
  // Promise.all groups behind an awaited prefs fetch — a four-level waterfall
  // even though only the household daily query actually depends on another.
  const prefsPromise = getUserPreferences(user.id);
  const personalMonthlyPromise = getMonthlyHistory({ scope: 'personal' });
  const householdMonthlyPromise = getMonthlyHistory({ scope: 'household' });
  const personalDailyPromise = getDailyComparisonData({
    currentMonth,
    scope: 'personal',
  });
  const personalIncomeVsExpensePromise = getMonthlyIncomeVsExpenseData({
    scope: 'personal',
  });
  const personalCumulativeSavingsPromise = getCumulativeSavingsData({
    scope: 'personal',
  });

  // Household daily comparison is the only query gated on whether a household
  // exists, so resolve that signal first, then fan back out.
  const householdMonthly = await householdMonthlyPromise;
  const householdAvailable = householdMonthly.errorCode !== 'no_household';
  const householdDailyPromise = householdAvailable
    ? getDailyComparisonData({ currentMonth, scope: 'household' })
    : Promise.resolve({
        data: {
          currentMonth,
          previousMonth: currentMonth,
          current: [],
          previous: [],
        },
        errorCode: 'no_household' as const,
      });

  const [
    prefs,
    personalMonthly,
    personalDaily,
    householdDaily,
    personalIncomeVsExpense,
    personalCumulativeSavings,
  ] = await Promise.all([
    prefsPromise,
    personalMonthlyPromise,
    personalDailyPromise,
    householdDailyPromise,
    personalIncomeVsExpensePromise,
    personalCumulativeSavingsPromise,
  ]);

  const currency = prefs?.currency ?? 'USD';

  return (
    <Flex direction="column" padding={3} gap={5}>
      <AppNavbar />
      <ExpenseScopePanels
        currency={currency}
        householdAvailable={householdAvailable}
        personal={{
          months: personalMonthly.data.months,
          rows: personalMonthly.data.rows,
          daily: personalDaily.data,
          cashflow: {
            monthlyIncomeVsExpense: personalIncomeVsExpense.data.months,
            cumulativeSavings: personalCumulativeSavings.data.months,
          },
        }}
        household={{
          months: householdMonthly.data.months,
          rows: householdMonthly.data.rows,
          daily: householdDaily.data,
          cashflow: {
            monthlyIncomeVsExpense: [],
            cumulativeSavings: [],
          },
        }}
      />
    </Flex>
  );
}
