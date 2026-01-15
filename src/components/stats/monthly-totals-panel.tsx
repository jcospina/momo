'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useMemo } from 'react';

import styles from '@/app/home/stats/stats.module.css';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { MonthlyTotalsBarChart } from '@components/charts/monthly-totals-bar-chart';
import { buildMonthlyCategoryTotals } from '@helpers/expenses/expense-stats.aggregations';
import { formatMonthRange } from '@helpers/expenses/expense-stats.months';
import { useEmblaSync } from '@hooks/use-embla-sync';
import { useMonthlyWindows } from '@hooks/use-monthly-windows';
import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';
import { Flex } from '@ui/flex/flex';
import { LeftIcon } from '@ui/icons/left';
import { RightIcon } from '@ui/icons/right';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { Typography } from '@ui/typography/typography';

const RANGE_OPTIONS = [
  { label: '3m', value: '3' },
  { label: '6m', value: '6' },
  { label: '12m', value: '12' },
];

type MonthlyTotalsPanelProps = {
  months: string[];
  breakdownRows: MonthlyByCategoryUserRow[];
  currency: string;
};

export function MonthlyTotalsPanel({
  months,
  breakdownRows,
  currency,
}: MonthlyTotalsPanelProps) {
  const isNarrow = useMediaQuery(mq('(max-width: 768px)'));
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
  });

  const monthlyTotals = useMemo(
    () => buildMonthlyCategoryTotals(breakdownRows, months),
    [breakdownRows, months],
  );

  const {
    selectedRange,
    setSelectedRange,
    windows: barMonths,
    activeIndex,
    setActiveIndex,
  } = useMonthlyWindows(monthlyTotals, { defaultRange: '3' });

  useEmblaSync(emblaApi, {
    activeIndex,
    onSelect: setActiveIndex,
  });

  const handleRangeChange = (value: string[]) => {
    const next = value[0];
    if (!next) return;
    setSelectedRange(next);
  };

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < barMonths.length - 1;

  const handlePrev = () => {
    if (!canGoPrev) return;
    setActiveIndex(activeIndex - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setActiveIndex(activeIndex + 1);
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
          <Flex alignItems="center" gap={2} wrap={isNarrow ? 'wrap' : 'nowrap'}>
            <ToggleGroup
              items={RANGE_OPTIONS}
              value={[selectedRange]}
              onValueChange={handleRangeChange}
            />
          </Flex>
        </Flex>
        <Typography size="sm">
          {formatMonthRange(
            (barMonths[activeIndex] ?? []).map(entry => entry.month),
          )}
        </Typography>
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
        <div className={styles['stats__embla-viewport']} ref={emblaRef}>
          <div className={styles['stats__embla-container']}>
            {barMonths.map((window, index) => (
              <div className={styles['stats__embla-slide']} key={index}>
                <div className={styles['stats__chart--bar']}>
                  <MonthlyTotalsBarChart months={window} currency={currency} />
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
    </>
  );
}
