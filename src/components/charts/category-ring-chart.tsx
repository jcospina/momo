'use client';

import { OTHERS_CATEGORY_KEY } from '@constants/expenses/categories';
import { useCategoryLabel } from '@hooks/use-category-label';
import { useCallback, useMemo } from 'react';
import { categoryColorVar, OTHERS_COLOR_VAR } from '@/lib/theme/color-vars';

import { RingChart, type RingChartItem } from './ring-chart';

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

function prepareData(
  items: RingItem[],
  labelFor: (category: string) => string,
) {
  const sorted = [...items].sort(
    (left, right) => right.totalCents - left.totalCents,
  );
  const top = sorted.slice(0, TOP_COUNT);
  const rest = sorted.slice(TOP_COUNT);
  const othersTotal = rest.reduce((sum, item) => sum + item.totalCents, 0);

  // Each slice keeps its category's fixed colour, whatever its rank.
  const data: RingChartItem[] = top.map(item => ({
    key: item.category,
    name: labelFor(item.category),
    value: item.totalCents,
    color: categoryColorVar(item.category),
  }));

  if (rest.length > 0) {
    data.push({
      key: OTHERS_CATEGORY_KEY,
      name: labelFor(OTHERS_CATEGORY_KEY),
      value: othersTotal,
      color: OTHERS_COLOR_VAR,
    });
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
  const labelFor = useCategoryLabel();
  const { seriesData, othersCategories, othersBreakdown } = useMemo(
    () => prepareData(items, labelFor),
    [items, labelFor],
  );

  const handleItemClick = useCallback(
    (payload: RingChartItem) => {
      if (payload.key === OTHERS_CATEGORY_KEY) {
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
        if (payload.key === OTHERS_CATEGORY_KEY) {
          if (!othersBreakdown.length) return [];
          const formatter = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
            maximumFractionDigits: currency === 'COP' ? 0 : 2,
          });
          return othersBreakdown.map(entry => {
            const value = entry.totalCents / (currency === 'COP' ? 1 : 100);
            return {
              label: labelFor(entry.category),
              value: formatter.format(value),
              emphasizeLabel: true,
            };
          });
        }
        const breakdown = tooltipByCategory?.[payload.key ?? ''] ?? [];
        if (!breakdown.length) return [];
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
          maximumFractionDigits: currency === 'COP' ? 0 : 2,
        });
        return breakdown.map(entry => {
          const value = entry.totalCents / (currency === 'COP' ? 1 : 100);
          return {
            label: entry.label,
            value: formatter.format(value),
            emphasizeLabel: true,
          };
        });
      }}
      onItemClick={handleItemClick}
    />
  );
}
