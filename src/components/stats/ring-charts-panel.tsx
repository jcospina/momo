'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useMemo } from 'react';

import styles from '@/app/home/stats/stats.module.css';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { CategoryRingChart } from '@components/charts/category-ring-chart';
import { UserTotalsRingChart } from '@components/charts/user-totals-ring-chart';
import { buildCategoryUserWindowData } from '@helpers/expenses/expense-stats.aggregations';
import { formatMonthRange } from '@helpers/expenses/expense-stats.months';
import { useEmblaSync } from '@hooks/use-embla-sync';
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
};

export function RingChartsPanel({
  months,
  breakdownRows,
  currency,
}: RingChartsPanelProps) {
  const isNarrow = useMediaQuery(mq('(max-width: 768px)'));
  const [userEmblaRef, userEmblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
  });
  const [categoryEmblaRef, categoryEmblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
  });

  const {
    selectedRange,
    setSelectedRange,
    windows: rangeMonths,
    activeIndex,
    setActiveIndex,
  } = useMonthlyWindows(months, { defaultRange: '1' });

  useEmblaSync(userEmblaApi, {
    activeIndex,
    onSelect: setActiveIndex,
  });
  useEmblaSync(categoryEmblaApi, {
    activeIndex,
    onSelect: setActiveIndex,
  });

  const monthLabel = formatMonthRange(rangeMonths[activeIndex] ?? []);

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

  const handlePrev = () => {
    if (!canGoPrev) return;
    setActiveIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setActiveIndex(activeIndex + 1);
  };

  return (
    <div className={styles['stats__ring-row']}>
      {windowData[activeIndex]?.userTotalsItems.length ? (
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
          <div className={styles['stats__embla']}>
            <button
              type="button"
              aria-label="Previous months"
              onClick={handlePrev}
              className={styles['stats__nav-button']}
              data-hidden={canGoPrev ? 'false' : 'true'}
            >
              <LeftIcon aria-hidden="true" />
            </button>
            <div className={styles['stats__embla-viewport']} ref={userEmblaRef}>
              <div className={styles['stats__embla-container']}>
                {windowData.map((window, index) => (
                  <div className={styles['stats__embla-slide']} key={index}>
                    <div className={styles['stats__chart--user-ring']}>
                      <UserTotalsRingChart
                        items={window.userTotalsItems}
                        currency={currency}
                        tooltipByUser={window.userTooltip}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
        <div className={styles['stats__embla']}>
          <button
            type="button"
            aria-label="Previous months"
            onClick={handlePrev}
            className={styles['stats__nav-button']}
            data-hidden={canGoPrev ? 'false' : 'true'}
          >
            <LeftIcon aria-hidden="true" />
          </button>
          <div
            className={styles['stats__embla-viewport']}
            ref={categoryEmblaRef}
          >
            <div className={styles['stats__embla-container']}>
              {windowData.map((window, index) => (
                <div className={styles['stats__embla-slide']} key={index}>
                  <div className={styles['stats__chart']}>
                    <CategoryRingChart
                      monthLabel={formatMonthRange(window.windowMonths)}
                      items={window.categoryItems}
                      currency={currency}
                      tooltipByCategory={window.categoryTooltip}
                    />
                  </div>
                </div>
              ))}
            </div>
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
