'use client';

import { useMemo } from 'react';

import styles from '@/app/home/stats/stats.module.css';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { CategoryRingChart } from '@components/charts/category-ring-chart';
import { UserTotalsRingChart } from '@components/charts/user-totals-ring-chart';
import { buildCategoryUserWindowData } from '@helpers/expenses/expense-stats.aggregations';
import { formatMonthRange } from '@helpers/expenses/expense-stats.months';
import { useMonthlyWindows } from '@hooks/use-monthly-windows';
import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';
import { Flex } from '@ui/flex/flex';
import { LeftIcon } from '@ui/icons/left';
import { RightIcon } from '@ui/icons/right';
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
  months: string[];
  breakdownRows: MonthlyByCategoryUserRow[];
  currency: string;
  showHouseholdTotals?: boolean;
};

type CategoryRingPanelProps = {
  months: string[];
  breakdownRows: MonthlyByCategoryUserRow[];
  currency: string;
  showMemberTooltip?: boolean;
};

function useCategoryRingData(
  months: string[],
  breakdownRows: MonthlyByCategoryUserRow[],
) {
  const {
    selectedRange,
    setSelectedRange,
    windows: rangeMonths,
    activeIndex,
    setActiveIndex,
  } = useMonthlyWindows(months, { defaultRange: '1' });

  const windowData = useMemo(
    () =>
      rangeMonths.map(windowMonths => ({
        windowMonths,
        ...buildCategoryUserWindowData(breakdownRows, windowMonths),
      })),
    [breakdownRows, rangeMonths],
  );

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < rangeMonths.length - 1;

  return {
    selectedRange,
    setSelectedRange,
    rangeMonths,
    activeIndex,
    setActiveIndex,
    windowData,
    canGoPrev,
    canGoNext,
  };
}

export function CategoryRingPanel({
  months,
  breakdownRows,
  currency,
  showMemberTooltip = false,
}: CategoryRingPanelProps) {
  const isNarrow = useMediaQuery(mq('(max-width: 768px)'));

  const {
    selectedRange,
    setSelectedRange,
    rangeMonths,
    activeIndex,
    setActiveIndex,
    windowData,
    canGoPrev,
    canGoNext,
  } = useCategoryRingData(months, breakdownRows);

  const monthLabel = formatMonthRange(rangeMonths[activeIndex] ?? []);

  const handlePrev = () => {
    if (!canGoPrev) return;
    setActiveIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setActiveIndex(activeIndex + 1);
  };

  return (
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
          <Flex alignItems="center" gap={2} wrap={isNarrow ? 'wrap' : 'nowrap'}>
            <ToggleGroup
              items={RANGE_OPTIONS}
              value={[selectedRange]}
              onValueChange={value => {
                const next = value[0];
                if (!next) return;
                setSelectedRange(next);
              }}
            />
          </Flex>
        </Flex>
        <Typography size="sm">{monthLabel}</Typography>
      </Flex>
      <div className={styles['stats__chart-shell']}>
        <button
          type="button"
          aria-label="Previous months"
          onClick={handlePrev}
          className={styles['stats__nav-button']}
          data-hidden={canGoPrev ? 'false' : 'true'}
        >
          <LeftIcon aria-hidden="true" />
        </button>
        <div className={styles['stats__chart']}>
          <CategoryRingChart
            monthLabel={formatMonthRange(
              windowData[activeIndex]?.windowMonths ?? [],
            )}
            items={windowData[activeIndex]?.categoryItems ?? []}
            currency={currency}
            tooltipByCategory={
              showMemberTooltip
                ? windowData[activeIndex]?.categoryTooltip
                : undefined
            }
          />
        </div>
        <button
          type="button"
          aria-label="Next months"
          onClick={handleNext}
          className={styles['stats__nav-button']}
          data-hidden={canGoNext ? 'false' : 'true'}
        >
          <RightIcon aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

export function RingChartsPanel({
  months,
  breakdownRows,
  currency,
  showHouseholdTotals = true,
}: RingChartsPanelProps) {
  const isNarrow = useMediaQuery(mq('(max-width: 768px)'));

  const {
    selectedRange,
    setSelectedRange,
    rangeMonths,
    activeIndex,
    setActiveIndex,
    windowData,
    canGoPrev,
    canGoNext,
  } = useCategoryRingData(months, breakdownRows);

  const monthLabel = formatMonthRange(rangeMonths[activeIndex] ?? []);

  const handlePrev = () => {
    if (!canGoPrev) return;
    setActiveIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setActiveIndex(activeIndex + 1);
  };

  return (
    <div
      className={cn(
        styles['stats__ring-row'],
        !showHouseholdTotals && styles['stats__ring-row--single'],
      )}
    >
      {showHouseholdTotals ? (
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
              <Flex
                alignItems="center"
                gap={2}
                wrap={isNarrow ? 'wrap' : 'nowrap'}
              >
                <ToggleGroup
                  items={RANGE_OPTIONS}
                  value={[selectedRange]}
                  onValueChange={value => {
                    const next = value[0];
                    if (!next) return;
                    setSelectedRange(next);
                  }}
                />
              </Flex>
            </Flex>
            <Typography size="sm">{monthLabel}</Typography>
          </Flex>
          <div className={styles['stats__chart-shell']}>
            <button
              type="button"
              aria-label="Previous months"
              onClick={handlePrev}
              className={styles['stats__nav-button']}
              data-hidden={canGoPrev ? 'false' : 'true'}
            >
              <LeftIcon aria-hidden="true" />
            </button>
            <div className={styles['stats__chart--user-ring']}>
              <UserTotalsRingChart
                items={windowData[activeIndex]?.userTotalsItems ?? []}
                currency={currency}
                tooltipByUser={windowData[activeIndex]?.userTooltip}
              />
            </div>
            <button
              type="button"
              aria-label="Next months"
              onClick={handleNext}
              className={styles['stats__nav-button']}
              data-hidden={canGoNext ? 'false' : 'true'}
            >
              <RightIcon aria-hidden="true" />
            </button>
          </div>
        </Panel>
      ) : null}
      <Panel
        shadowless
        className={cn(
          styles['stats__panel'],
          styles['stats__ring-panel'],
          styles['stats__ring-panel--category'],
          !showHouseholdTotals && styles['stats__ring-panel--full'],
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
            <Flex
              alignItems="center"
              gap={2}
              wrap={isNarrow ? 'wrap' : 'nowrap'}
            >
              <ToggleGroup
                items={RANGE_OPTIONS}
                value={[selectedRange]}
                onValueChange={value => {
                  const next = value[0];
                  if (!next) return;
                  setSelectedRange(next);
                }}
              />
            </Flex>
          </Flex>
          <Typography size="sm">{monthLabel}</Typography>
        </Flex>
        <div className={styles['stats__chart-shell']}>
          <button
            type="button"
            aria-label="Previous months"
            onClick={handlePrev}
            className={styles['stats__nav-button']}
            data-hidden={canGoPrev ? 'false' : 'true'}
          >
            <LeftIcon aria-hidden="true" />
          </button>
          <div className={styles['stats__chart']}>
            <CategoryRingChart
              monthLabel={formatMonthRange(
                windowData[activeIndex]?.windowMonths ?? [],
              )}
              items={windowData[activeIndex]?.categoryItems ?? []}
              currency={currency}
              tooltipByCategory={
                showHouseholdTotals
                  ? windowData[activeIndex]?.categoryTooltip
                  : undefined
              }
            />
          </div>
          <button
            type="button"
            aria-label="Next months"
            onClick={handleNext}
            className={styles['stats__nav-button']}
            data-hidden={canGoNext ? 'false' : 'true'}
          >
            <RightIcon aria-hidden="true" />
          </button>
        </div>
      </Panel>
    </div>
  );
}
