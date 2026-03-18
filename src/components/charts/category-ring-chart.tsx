'use client';

import { formatCategoryLabel } from '@helpers/expenses/expense-stats.aggregations';
import { useCallback, useMemo } from 'react';

import { RingChart, type RingChartItem } from './ring-chart';

const OTHERS_LABEL = 'Others';
const TOP_COUNT = 5;

type RingItem = {
  category: string;
  totalCents: number;
};

type CategoryRingChartProps = {
  monthLabel: string;
  items: RingItem[];
  currency: string;
  tooltipByCategory?: Record<
    string,
    Array<{ label: string; totalCents: number }>
  >;
  onCategoryClick?: (payload: {
    monthLabel: string;
    category: string;
    totalCents: number;
  }) => void;
  onOthersClick?: (payload: {
    monthLabel: string;
    categories: string[];
    totalCents: number;
  }) => void;
};

function prepareData(items: RingItem[]) {
  const sorted = [...items].sort(
    (left, right) => right.totalCents - left.totalCents,
  );
  const top = sorted.slice(0, TOP_COUNT);
  const rest = sorted.slice(TOP_COUNT);
  const othersTotal = rest.reduce((sum, item) => sum + item.totalCents, 0);

  const data: RingChartItem[] = top.map(item => ({
    name: formatCategoryLabel(item.category),
    value: item.totalCents,
  }));

  if (rest.length > 0) {
    data.push({ name: OTHERS_LABEL, value: othersTotal });
  }

  return {
    seriesData: data,
    othersCategories: rest.map(item => item.category),
    othersBreakdown: rest.map(item => ({
      category: item.category,
      totalCents: item.totalCents,
    })),
  };
}

export function CategoryRingChart({
  monthLabel,
  items,
  currency,
  tooltipByCategory,
  onCategoryClick,
  onOthersClick,
}: CategoryRingChartProps) {
  const { seriesData, othersCategories, othersBreakdown } = useMemo(
    () => prepareData(items),
    [items],
  );

  const handleItemClick = useCallback(
    (payload: RingChartItem) => {
      if (payload.name === OTHERS_LABEL) {
        onOthersClick?.({
          monthLabel,
          categories: othersCategories,
          totalCents: payload.value,
        });
        return;
      }
      onCategoryClick?.({
        monthLabel,
        category: payload.name,
        totalCents: payload.value,
      });
    },
    [monthLabel, onCategoryClick, onOthersClick, othersCategories],
  );

  return (
    <RingChart
      items={seriesData}
      currency={currency}
      getTooltipLines={payload => {
        if (payload.name === OTHERS_LABEL) {
          if (!othersBreakdown.length) return [];
          const formatter = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
            maximumFractionDigits: currency === 'COP' ? 0 : 2,
          });
          return othersBreakdown.map(entry => {
            const value = entry.totalCents / (currency === 'COP' ? 1 : 100);
            return `<strong>${formatCategoryLabel(
              entry.category,
            )}</strong>: ${formatter.format(value)}`;
          });
        }
        const breakdown = tooltipByCategory?.[payload.name] ?? [];
        if (!breakdown.length) return [];
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
          maximumFractionDigits: currency === 'COP' ? 0 : 2,
        });
        return breakdown.map(entry => {
          const value = entry.totalCents / (currency === 'COP' ? 1 : 100);
          return `<strong>${entry.label}</strong>: ${formatter.format(value)}`;
        });
      }}
      onItemClick={handleItemClick}
    />
  );
}
