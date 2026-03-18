'use client';

import { DailyComparisonLineChart } from '@components/charts/daily-comparison-line-chart';
import { MonthlyTotalsPanel } from '@components/stats/monthly-totals-panel';
import {
  CategoryRingPanel,
  RingChartsPanel,
} from '@components/stats/ring-charts-panel';
import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';
import { Flex } from '@ui/flex/flex';
import { Panel } from '@ui/panel/panel';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { Typography } from '@ui/typography/typography';
import { format, isValid, parse } from 'date-fns';
import { useState } from 'react';
import styles from '@/app/home/stats/stats.module.css';

type DailyComparisonData = {
  currentMonth: string;
  previousMonth: string;
  current: Array<{ day: number; totalCents: number }>;
  previous: Array<{ day: number; totalCents: number }>;
};

type ScopeData = {
  months: string[];
  rows: MonthlyByCategoryUserRow[];
  daily: DailyComparisonData;
};

type ExpenseScopePanelsProps = {
  personal: ScopeData;
  household: ScopeData;
  currency: string;
  householdAvailable: boolean;
};

const SCOPE_OPTIONS = [
  { label: 'Personal', value: 'personal' },
  { label: 'Household', value: 'household' },
];

function formatMonthLabel(month: string) {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (!isValid(parsed)) return month;
  return format(parsed, 'MMM yyyy');
}

type ScopePanelsProps = {
  data: ScopeData;
  currency: string;
  showHouseholdTotals: boolean;
};

function ScopePanels({
  data,
  currency,
  showHouseholdTotals,
}: ScopePanelsProps) {
  const dailyLabel = formatMonthLabel(data.daily.currentMonth);

  return (
    <>
      <RingChartsPanel
        months={data.months}
        breakdownRows={data.rows}
        currency={currency}
        showHouseholdTotals={showHouseholdTotals}
      />
      <Panel shadowless className={styles['stats__panel']}>
        <MonthlyTotalsPanel
          months={data.months}
          breakdownRows={data.rows}
          currency={currency}
        />
      </Panel>
      <Panel shadowless className={styles['stats__panel']}>
        <Flex direction="column" gap={1} padding={3}>
          <Typography as="h2" size="lg" weight="bold">
            Daily comparison
          </Typography>
          <Typography size="sm">
            {formatMonthLabel(data.daily.currentMonth)} vs{' '}
            {formatMonthLabel(data.daily.previousMonth)}
          </Typography>
        </Flex>
        <div className={styles['stats__chart--line']}>
          <DailyComparisonLineChart
            monthLabel={dailyLabel}
            current={data.daily.current}
            previous={data.daily.previous}
            currency={currency}
          />
        </div>
      </Panel>
    </>
  );
}

type PersonalScopePanelsProps = {
  data: ScopeData;
  currency: string;
};

function PersonalScopePanels({ data, currency }: PersonalScopePanelsProps) {
  const dailyLabel = formatMonthLabel(data.daily.currentMonth);

  return (
    <>
      <div className={styles['stats__personal-row']}>
        <CategoryRingPanel
          months={data.months}
          breakdownRows={data.rows}
          currency={currency}
        />
        <Panel shadowless className={styles['stats__panel']}>
          <Flex direction="column" gap={1} padding={3}>
            <Typography as="h2" size="lg" weight="bold">
              Daily comparison
            </Typography>
            <Typography size="sm">
              {formatMonthLabel(data.daily.currentMonth)} vs{' '}
              {formatMonthLabel(data.daily.previousMonth)}
            </Typography>
          </Flex>
          <div className={styles['stats__chart--line']}>
            <DailyComparisonLineChart
              monthLabel={dailyLabel}
              current={data.daily.current}
              previous={data.daily.previous}
              currency={currency}
            />
          </div>
        </Panel>
      </div>
      <Panel shadowless className={styles['stats__panel']}>
        <MonthlyTotalsPanel
          months={data.months}
          breakdownRows={data.rows}
          currency={currency}
        />
      </Panel>
    </>
  );
}

export function ExpenseScopePanels({
  personal,
  household,
  currency,
  householdAvailable,
}: ExpenseScopePanelsProps) {
  const [scope, setScope] = useState<'personal' | 'household'>(
    householdAvailable ? 'household' : 'personal',
  );

  return (
    <Flex direction="column" gap={5} isFullWidth>
      {householdAvailable ? (
        <Flex
          alignItems="center"
          justifyContent="center"
          padding={3}
          isFullWidth
        >
          <ToggleGroup
            items={SCOPE_OPTIONS}
            value={[scope]}
            onValueChange={value => {
              const next = value[0];
              if (!next) return;
              setScope(next as 'personal' | 'household');
            }}
          />
        </Flex>
      ) : null}
      {scope === 'household' && householdAvailable ? (
        <ScopePanels
          key="household"
          data={household}
          currency={currency}
          showHouseholdTotals
        />
      ) : (
        <PersonalScopePanels
          key="personal"
          data={personal}
          currency={currency}
        />
      )}
    </Flex>
  );
}
