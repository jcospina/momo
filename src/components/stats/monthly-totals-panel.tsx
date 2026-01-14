'use client';

import { useMemo, useState } from 'react';

import styles from '@/app/home/stats/stats.module.css';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import type { MonthlyCategoryTotals } from '@actions/expense-stats';
import { MonthlyTotalsBarChart } from '@components/charts/monthly-totals-bar-chart';
import { Flex } from '@ui/flex/flex';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { Typography } from '@ui/typography/typography';

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

const RANGE_OPTIONS = [
  { label: '3m', value: '3' },
  { label: '6m', value: '6' },
  { label: '12m', value: '12' },
];

type MonthlyTotalsPanelProps = {
  months3: MonthlyCategoryTotals[];
  months6: MonthlyCategoryTotals[];
  months12: MonthlyCategoryTotals[];
  currency: string;
};

export function MonthlyTotalsPanel({
  months3,
  months6,
  months12,
  currency,
}: MonthlyTotalsPanelProps) {
  const [selectedRange, setSelectedRange] = useState('3');
  const isNarrow = useMediaQuery(mq('(max-width: 390px)'));

  const barMonths = useMemo(() => {
    if (selectedRange === '12') return months12;
    if (selectedRange === '6') return months6;
    return months3;
  }, [months12, months3, months6, selectedRange]);

  const handleRangeChange = (value: string[]) => {
    const next = value[0];
    if (!next) return;
    setSelectedRange(next);
  };

  return (
    <>
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
            Monthly totals
          </Typography>
          <ToggleGroup
            items={RANGE_OPTIONS}
            value={[selectedRange]}
            onValueChange={handleRangeChange}
          />
        </Flex>
        <Typography size="sm">
          {formatMonthRange(barMonths.map(entry => entry.month))}
        </Typography>
      </Flex>
      <div className={styles['stats__chart--bar']}>
        <MonthlyTotalsBarChart months={barMonths} currency={currency} />
      </div>
    </>
  );
}
