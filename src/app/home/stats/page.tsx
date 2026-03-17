import { format } from 'date-fns';

import {
  getDailyComparisonData,
  getMonthlyHistory,
} from '@/lib/data/stats/server';
import { getCurrentUser } from '@/lib/data/auth/server';
import { getUserPreferences } from '@/lib/data/prefs/server';
import { Navbar } from '@components/navbar/navbar';
import { ExpenseScopePanels } from '@components/stats/expense-scope-panels';
import { Flex } from '@ui/flex/flex';
import { redirect } from 'next/navigation';

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const prefs = await getUserPreferences(user.id);
  const currency = prefs?.currency ?? 'USD';
  const currentMonth = format(new Date(), 'yyyy-MM');

  const [personalMonthly, householdMonthly] = await Promise.all([
    getMonthlyHistory({ scope: 'personal' }),
    getMonthlyHistory({ scope: 'household' }),
  ]);

  const householdAvailable = householdMonthly.errorCode !== 'no_household';

  const [personalDaily, householdDaily] = await Promise.all([
    getDailyComparisonData({ currentMonth, scope: 'personal' }),
    householdAvailable
      ? getDailyComparisonData({ currentMonth, scope: 'household' })
      : Promise.resolve({
          data: {
            currentMonth,
            previousMonth: currentMonth,
            current: [],
            previous: [],
          },
          errorCode: 'no_household' as const,
        }),
  ]);

  return (
    <Flex direction="column" padding={3} gap={5}>
      <Navbar />
      <ExpenseScopePanels
        currency={currency}
        householdAvailable={householdAvailable}
        personal={{
          months: personalMonthly.data.months,
          rows: personalMonthly.data.rows,
          daily: personalDaily.data,
        }}
        household={{
          months: householdMonthly.data.months,
          rows: householdMonthly.data.rows,
          daily: householdDaily.data,
        }}
      />
    </Flex>
  );
}
