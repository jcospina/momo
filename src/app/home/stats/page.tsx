import { format, isValid, parse } from 'date-fns';

import {
  getDailyComparisonData,
  getMonthlyCategoryRange,
  getMonthlyCategoryUserRange,
} from '@actions/expense-stats';
import { DailyComparisonLineChart } from '@components/charts/daily-comparison-line-chart';
import { Navbar } from '@components/navbar/navbar';
import { MonthlyTotalsPanel } from '@components/stats/monthly-totals-panel';
import { RingChartsPanel } from '@components/stats/ring-charts-panel';
import { getCurrentUser } from '@helpers/user';
import { getUserPreferences } from '@helpers/user-prefs';
import { Flex } from '@ui/flex/flex';
import { Panel } from '@ui/panel/panel';
import { Typography } from '@ui/typography/typography';
import { redirect } from 'next/navigation';
import styles from './stats.module.css';

function formatMonthLabel(month: string) {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (!isValid(parsed)) return month;
  return format(parsed, 'MMM yyyy');
}

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const prefs = await getUserPreferences(user.id);
  const currency = prefs?.currency ?? 'USD';
  const currentMonth = format(new Date(), 'yyyy-MM');

  const [
    range3Result,
    range6Result,
    range12Result,
    breakdownResult,
    dailyResult,
  ] = await Promise.all([
    getMonthlyCategoryRange({
      count: 3,
      endMonth: currentMonth,
      scope: 'auto',
    }),
    getMonthlyCategoryRange({
      count: 6,
      endMonth: currentMonth,
      scope: 'auto',
    }),
    getMonthlyCategoryRange({
      count: 12,
      endMonth: currentMonth,
      scope: 'auto',
    }),
    getMonthlyCategoryUserRange({
      count: 12,
      endMonth: currentMonth,
      scope: 'auto',
    }),
    getDailyComparisonData({ currentMonth, scope: 'auto' }),
  ]);

  const breakdownRows = breakdownResult.data.rows;
  const months3 = range3Result.data.months;
  const months6 = range6Result.data.months;
  const months12 = range12Result.data.months;
  const dailyLabel = formatMonthLabel(dailyResult.data.currentMonth);

  return (
    <Flex direction="column" padding={3} gap={5}>
      <Navbar />
      <RingChartsPanel
        months12={months12}
        breakdownRows={breakdownRows}
        currency={currency}
      />
      <Panel shadowless className={styles['stats__panel']}>
        <MonthlyTotalsPanel
          months3={months3}
          months6={months6}
          months12={months12}
          currency={currency}
        />
      </Panel>
      <Panel shadowless className={styles['stats__panel']}>
        <Flex direction="column" gap={1} padding={3}>
          <Typography as="h2" size="lg" weight="bold">
            Daily comparison
          </Typography>
          <Typography size="sm">
            {formatMonthLabel(dailyResult.data.currentMonth)} vs{' '}
            {formatMonthLabel(dailyResult.data.previousMonth)}
          </Typography>
        </Flex>
        <div className={styles['stats__chart--line']}>
          <DailyComparisonLineChart
            monthLabel={dailyLabel}
            current={dailyResult.data.current}
            previous={dailyResult.data.previous}
            currency={currency}
          />
        </div>
      </Panel>
    </Flex>
  );
}
