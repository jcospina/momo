'use client';

import { useMemo, useState } from 'react';

import styles from '@/app/home/stats/stats.module.css';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import type { MonthlyCategoryTotals } from '@actions/expense-stats';
import { CategoryRingChart } from '@components/charts/category-ring-chart';
import { UserTotalsRingChart } from '@components/charts/user-totals-ring-chart';
import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';
import { Flex } from '@ui/flex/flex';
import { Panel } from '@ui/panel/panel';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';

const RANGE_OPTIONS = [
  { label: '1m', value: '1' },
  { label: '3m', value: '3' },
  { label: '6m', value: '6' },
  { label: '12m', value: '12' },
];

type RingChartsPanelProps = {
  months12: MonthlyCategoryTotals[];
  breakdownRows: MonthlyByCategoryUserRow[];
  currency: string;
};

function formatMonthLabel(month: string) {
  const parsed = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return month;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(parsed);
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

export function RingChartsPanel({
  months12,
  breakdownRows,
  currency,
}: RingChartsPanelProps) {
  const [selectedRange, setSelectedRange] = useState('1');
  const isNarrow = useMediaQuery(mq('(max-width: 390px)'));

  const rangeMonths = useMemo(() => {
    const total = Math.max(1, Math.min(12, Number(selectedRange) || 1));
    const months = months12.map(entry => entry.month);
    return months.slice(-total);
  }, [months12, selectedRange]);

  const monthLabel = formatMonthRange(rangeMonths);

  const categoryItems = useMemo(() => {
    const totals = new Map<string, number>();
    months12.forEach(entry => {
      if (!rangeMonths.includes(entry.month)) return;
      entry.categories.forEach(categoryEntry => {
        const category = categoryEntry.category ?? 'uncategorized';
        totals.set(
          category,
          (totals.get(category) ?? 0) + categoryEntry.totalCents,
        );
      });
    });

    return Array.from(totals.entries()).map(([category, totalCents]) => ({
      category,
      totalCents,
    }));
  }, [months12, rangeMonths]);

  const filteredRows = useMemo(
    () => breakdownRows.filter(row => rangeMonths.includes(row.month)),
    [breakdownRows, rangeMonths],
  );

  const categoryTooltipMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    filteredRows.forEach(row => {
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
  }, [filteredRows]);

  const userTotalsItems = useMemo(() => {
    const totals = new Map<string, number>();
    filteredRows.forEach(row => {
      const label = toFirstName(row.user_label ?? 'Unknown');
      totals.set(label, (totals.get(label) ?? 0) + row.total_cents);
    });
    return Array.from(totals.entries())
      .map(([user_label, totalCents]) => ({ user_label, totalCents }))
      .filter(item => item.totalCents > 0);
  }, [filteredRows]);

  const userTooltipMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    filteredRows.forEach(row => {
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
  }, [filteredRows]);

  return (
    <div className={styles['stats__ring-row']}>
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
            <Flex
              alignItems={isNarrow ? 'flex-start' : 'center'}
              justifyContent="space-between"
              gap={isNarrow ? 1 : 2}
              isFullWidth
              direction={isNarrow ? 'column' : 'row'}
              className={styles['stats__header-row']}
            >
              <Typography as="h2" size="lg" weight="bold">
                Household totals by member
              </Typography>
              <ToggleGroup
                items={RANGE_OPTIONS}
                value={[selectedRange]}
                onValueChange={value => setSelectedRange(value[0] ?? '1')}
              />
            </Flex>
            <Typography size="sm">{monthLabel}</Typography>
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
      <Panel
        shadowless
        className={cn(
          styles['stats__panel'],
          styles['stats__ring-panel'],
          styles['stats__ring-panel--category'],
        )}
      >
        <Flex direction="column" gap={1} padding={3}>
          <Flex
            alignItems={isNarrow ? 'flex-start' : 'center'}
            justifyContent="space-between"
            gap={isNarrow ? 1 : 2}
            isFullWidth
            direction={isNarrow ? 'column' : 'row'}
            className={styles['stats__header-row']}
          >
            <Typography as="h2" size="lg" weight="bold">
              Expenses by category
            </Typography>
            <ToggleGroup
              items={RANGE_OPTIONS}
              value={[selectedRange]}
              onValueChange={value => setSelectedRange(value[0] ?? '1')}
            />
          </Flex>
          <Typography size="sm">{monthLabel}</Typography>
        </Flex>
        <div className={styles['stats__chart']}>
          <CategoryRingChart
            monthLabel={monthLabel}
            items={categoryItems}
            currency={currency}
            tooltipByCategory={categoryTooltipMap}
          />
        </div>
      </Panel>
    </div>
  );
}
