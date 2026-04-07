'use client';

import { CumulativeSavingsLineChart } from '@components/charts/cumulative-savings-line-chart';
import { MonthlyIncomeVsExpenseBarChart } from '@components/charts/monthly-income-vs-expense-bar-chart';
import { STATS_RANGE_OPTIONS } from '@constants/stats/range-options';
import { formatMonthRange } from '@helpers/expenses-stats/months';
import { useMonthlyWindows } from '@hooks/use-monthly-windows';
import { Flex } from '@ui/flex/flex';
import { LeftIcon } from '@ui/icons/left';
import { RightIcon } from '@ui/icons/right';
import { Panel } from '@ui/panel/panel';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import styles from '@/app/home/stats/stats.module.css';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import type {
  CumulativeSavingsPoint,
  MonthlyCashflowPoint,
} from '@/lib/data/stats/types';

type CashflowPanelsProps = {
  monthlyIncomeVsExpense: MonthlyCashflowPoint[];
  cumulativeSavings: CumulativeSavingsPoint[];
  currency: string;
};

function hasIncomeExpenseData(months: MonthlyCashflowPoint[]) {
  return months.some(
    point =>
      point.incomeCents > 0 || point.expenseCents > 0 || point.netCents !== 0,
  );
}

function hasCumulativeSavingsData(months: CumulativeSavingsPoint[]) {
  return months.some(
    point => point.netCents !== 0 || point.cumulativeCents !== 0,
  );
}

export function CashflowPanels({
  monthlyIncomeVsExpense,
  cumulativeSavings,
  currency,
}: CashflowPanelsProps) {
  const t = useTranslations('stats');
  const isNarrow = useMediaQuery(mq('(max-width: 768px)'));

  const {
    selectedRange: selectedIncomeRange,
    setSelectedRange: setSelectedIncomeRange,
    windows: incomeWindows,
    activeIndex: incomeActiveIndex,
    setActiveIndex: setIncomeActiveIndex,
  } = useMonthlyWindows(monthlyIncomeVsExpense, {
    defaultRange: '3',
  });

  const {
    selectedRange: selectedSavingsRange,
    setSelectedRange: setSelectedSavingsRange,
    windows: savingsWindows,
    activeIndex: savingsActiveIndex,
    setActiveIndex: setSavingsActiveIndex,
  } = useMonthlyWindows(cumulativeSavings, {
    defaultRange: '3',
  });

  const activeIncomeWindow = incomeWindows[incomeActiveIndex] ?? [];
  const activeSavingsWindow = savingsWindows[savingsActiveIndex] ?? [];

  const incomeMonthRange = useMemo(
    () => formatMonthRange(activeIncomeWindow.map(point => point.month)),
    [activeIncomeWindow],
  );

  const savingsMonthRange = useMemo(
    () => formatMonthRange(activeSavingsWindow.map(point => point.month)),
    [activeSavingsWindow],
  );

  const canGoIncomePrev = incomeActiveIndex > 0;
  const canGoIncomeNext = incomeActiveIndex < incomeWindows.length - 1;
  const canGoSavingsPrev = savingsActiveIndex > 0;
  const canGoSavingsNext = savingsActiveIndex < savingsWindows.length - 1;

  const showIncomeData = hasIncomeExpenseData(activeIncomeWindow);
  const showSavingsData = hasCumulativeSavingsData(activeSavingsWindow);

  return (
    <div className={styles['stats__ring-row']}>
      <Panel shadowless className={styles['stats__panel']}>
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
              {t('incomeVsExpenses')}
            </Typography>
            <Flex
              alignItems="center"
              gap={2}
              wrap={isNarrow ? 'wrap' : 'nowrap'}
            >
              <ToggleGroup
                items={STATS_RANGE_OPTIONS}
                value={[selectedIncomeRange]}
                onValueChange={value => {
                  const next = value[0];
                  if (!next) return;
                  setSelectedIncomeRange(next);
                }}
              />
            </Flex>
          </Flex>
          <Typography size="sm">{incomeMonthRange}</Typography>
        </Flex>
        <div className={styles['stats__chart-shell']}>
          <button
            type="button"
            aria-label={t('nav.prevCashflow')}
            onClick={() => {
              if (!canGoIncomePrev) return;
              setIncomeActiveIndex(incomeActiveIndex - 1);
            }}
            className={styles['stats__nav-button']}
            data-hidden={canGoIncomePrev ? 'false' : 'true'}
          >
            <LeftIcon aria-hidden="true" />
          </button>
          <div className={styles['stats__chart--bar']}>
            <MonthlyIncomeVsExpenseBarChart
              months={activeIncomeWindow}
              currency={currency}
            />
          </div>
          {!showIncomeData ? (
            <div className={styles['stats__chart-empty']}>{t('noData')}</div>
          ) : null}
          <button
            type="button"
            aria-label={t('nav.nextCashflow')}
            onClick={() => {
              if (!canGoIncomeNext) return;
              setIncomeActiveIndex(incomeActiveIndex + 1);
            }}
            className={styles['stats__nav-button']}
            data-hidden={canGoIncomeNext ? 'false' : 'true'}
          >
            <RightIcon aria-hidden="true" />
          </button>
        </div>
      </Panel>

      <Panel shadowless className={styles['stats__panel']}>
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
              {t('cumulativeSavings')}
            </Typography>
            <Flex
              alignItems="center"
              gap={2}
              wrap={isNarrow ? 'wrap' : 'nowrap'}
            >
              <ToggleGroup
                items={STATS_RANGE_OPTIONS}
                value={[selectedSavingsRange]}
                onValueChange={value => {
                  const next = value[0];
                  if (!next) return;
                  setSelectedSavingsRange(next);
                }}
              />
            </Flex>
          </Flex>
          <Typography size="sm">
            {savingsMonthRange}
            {savingsMonthRange ? ` - ${t('runningMonthlyNet')}` : ''}
          </Typography>
        </Flex>
        <div className={styles['stats__chart-shell']}>
          <button
            type="button"
            aria-label={t('nav.prevSavings')}
            onClick={() => {
              if (!canGoSavingsPrev) return;
              setSavingsActiveIndex(savingsActiveIndex - 1);
            }}
            className={styles['stats__nav-button']}
            data-hidden={canGoSavingsPrev ? 'false' : 'true'}
          >
            <LeftIcon aria-hidden="true" />
          </button>
          <div className={styles['stats__chart--line']}>
            <CumulativeSavingsLineChart
              months={activeSavingsWindow}
              currency={currency}
            />
          </div>
          {!showSavingsData ? (
            <div className={styles['stats__chart-empty']}>{t('noData')}</div>
          ) : null}
          <button
            type="button"
            aria-label={t('nav.nextSavings')}
            onClick={() => {
              if (!canGoSavingsNext) return;
              setSavingsActiveIndex(savingsActiveIndex + 1);
            }}
            className={styles['stats__nav-button']}
            data-hidden={canGoSavingsNext ? 'false' : 'true'}
          >
            <RightIcon aria-hidden="true" />
          </button>
        </div>
      </Panel>
    </div>
  );
}
