import { format, isValid, parse } from 'date-fns';

import {
  getDailyComparisonData,
  getMonthlyCategoryRange,
  getMonthlyCategoryUserBreakdown,
  getRingChartData,
  getUserTotalsForMonth,
} from '@actions/expense-stats';
import { CategoryRingChart } from '@components/charts/category-ring-chart';
import { DailyComparisonLineChart } from '@components/charts/daily-comparison-line-chart';
import { MonthlyTotalsBarChart } from '@components/charts/monthly-totals-bar-chart';
import { UserTotalsRingChart } from '@components/charts/user-totals-ring-chart';
import { Navbar } from '@components/navbar/navbar';
import { getCurrentUser } from '@helpers/user';
import { getUserPreferences } from '@helpers/user-prefs';
import { Flex } from '@ui/flex/flex';
import { Panel } from '@ui/panel/panel';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { redirect } from 'next/navigation';
import styles from './stats.module.css';

function formatMonthLabel(month: string) {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (!isValid(parsed)) return month;
  return format(parsed, 'MMM yyyy');
}

function formatMonthRange(months: string[]) {
  if (!months.length) return '';
  const first = formatMonthLabel(months[0]);
  const last = formatMonthLabel(months[months.length - 1]);
  return first === last ? first : `${first}–${last}`;
}

function formatCategoryLabel(category: string) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toFirstName(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return 'Unknown';
  const [firstToken] = trimmed.split(/\s+/);
  const [emailBase] = firstToken.split('@');
  const [simple] = emailBase.split(/[._-]/);
  return simple || emailBase || firstToken;
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
    ringResult,
    userTotalsResult,
    breakdownResult,
    range3Result,
    range6Result,
    range12Result,
    dailyResult,
  ] = await Promise.all([
    getRingChartData({ month: currentMonth, scope: 'auto' }),
    getUserTotalsForMonth({ month: currentMonth, scope: 'auto' }),
    getMonthlyCategoryUserBreakdown({ month: currentMonth, scope: 'auto' }),
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
    getDailyComparisonData({ currentMonth, scope: 'auto' }),
  ]);

  const ringMonthLabel = formatMonthLabel(ringResult.data.month);
  const userTotalsLabel = formatMonthLabel(userTotalsResult.data.month);
  const userTotalsItems = userTotalsResult.data.items.map(item => ({
    user_label: toFirstName(item.user_label),
    totalCents: item.totalCents,
  }));
  const breakdownRows = breakdownResult.data.rows;
  const months3 = range3Result.data.months;
  const months6 = range6Result.data.months;
  const months12 = range12Result.data.months;
  const dailyLabel = formatMonthLabel(dailyResult.data.currentMonth);

  const categoryTooltipMap = (() => {
    const map = new Map<string, Map<string, number>>();
    breakdownRows.forEach(row => {
      const category = formatCategoryLabel(row.category ?? 'uncategorized');
      const label = toFirstName(row.user_label ?? 'Unknown');
      const categoryMap = map.get(category) ?? new Map<string, number>();
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + row.total_cents);
      map.set(category, categoryMap);
    });
    const result: Record<
      string,
      Array<{ label: string; totalCents: number }>
    > = {};
    map.forEach((userMap, category) => {
      const entries = Array.from(userMap.entries())
        .map(([label, totalCents]) => ({ label, totalCents }))
        .filter(entry => entry.totalCents > 0)
        .sort((a, b) => b.totalCents - a.totalCents);
      result[category] = entries;
    });
    return result;
  })();

  const userTooltipMap = (() => {
    const map = new Map<string, Map<string, number>>();
    breakdownRows.forEach(row => {
      const label = toFirstName(row.user_label ?? 'Unknown');
      const category = formatCategoryLabel(row.category ?? 'uncategorized');
      const userMap = map.get(label) ?? new Map<string, number>();
      userMap.set(category, (userMap.get(category) ?? 0) + row.total_cents);
      map.set(label, userMap);
    });
    const result: Record<
      string,
      Array<{ category: string; totalCents: number }>
    > = {};
    map.forEach((categoryMap, label) => {
      const entries = Array.from(categoryMap.entries())
        .map(([category, totalCents]) => ({ category, totalCents }))
        .filter(entry => entry.totalCents > 0)
        .sort((a, b) => b.totalCents - a.totalCents);
      result[label] = entries;
    });
    return result;
  })();

  return (
    <Flex direction="column" padding={3} gap={5}>
      <Navbar />
      <div className={styles['stats__ring-row']}>
        <Panel
          shadowless
          className={cn(
            styles['stats__panel'],
            styles['stats__ring-panel'],
            styles['stats__ring-panel--category'],
          )}
        >
          <Flex direction="column" gap={1} padding={3}>
            <Typography as="h2" size="lg" weight="bold">
              Expenses by category
            </Typography>
            <Typography size="sm">{ringMonthLabel}</Typography>
          </Flex>
          <div className={styles['stats__chart']}>
            <CategoryRingChart
              monthLabel={ringMonthLabel}
              items={ringResult.data.items}
              currency={currency}
              tooltipByCategory={categoryTooltipMap}
            />
          </div>
        </Panel>
        {userTotalsItems.length > 0 ? (
          <Panel
            shadowless
            className={cn(
              styles['stats__panel'],
              styles['stats__ring-panel'],
              styles['stats__ring-panel--user'],
            )}
          >
            <Flex direction="column" gap={1} padding={3}>
              <Typography as="h2" size="lg" weight="bold">
                Household totals by member
              </Typography>
              <Typography size="sm">{userTotalsLabel}</Typography>
            </Flex>
            <div className={styles['stats__chart--user-ring']}>
              <UserTotalsRingChart
                items={userTotalsItems}
                currency={currency}
                tooltipByUser={userTooltipMap}
              />
            </div>
          </Panel>
        ) : null}
      </div>
      <Panel shadowless className={styles['stats__panel']}>
        <Flex direction="column" gap={1} padding={3}>
          <Typography as="h2" size="lg" weight="bold">
            Monthly totals (3 months)
          </Typography>
          <Typography size="sm">
            {formatMonthRange(months3.map(entry => entry.month))}
          </Typography>
        </Flex>
        <div className={styles['stats__chart--bar']}>
          <MonthlyTotalsBarChart months={months3} currency={currency} />
        </div>
      </Panel>
      <Panel shadowless className={styles['stats__panel']}>
        <Flex direction="column" gap={1} padding={3}>
          <Typography as="h2" size="lg" weight="bold">
            Monthly totals (6 months)
          </Typography>
          <Typography size="sm">
            {formatMonthRange(months6.map(entry => entry.month))}
          </Typography>
        </Flex>
        <div className={styles['stats__chart--bar']}>
          <MonthlyTotalsBarChart months={months6} currency={currency} />
        </div>
      </Panel>
      <Panel shadowless className={styles['stats__panel']}>
        <Flex direction="column" gap={1} padding={3}>
          <Typography as="h2" size="lg" weight="bold">
            Monthly totals (12 months)
          </Typography>
          <Typography size="sm">
            {formatMonthRange(months12.map(entry => entry.month))}
          </Typography>
        </Flex>
        <div className={styles['stats__chart--bar']}>
          <MonthlyTotalsBarChart months={months12} currency={currency} />
        </div>
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
