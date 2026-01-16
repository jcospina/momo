'use client';

import { useCallback, useMemo } from 'react';

import { RingChart, type RingChartItem } from './ring-chart';

type UserTotalItem = {
  user_label: string;
  totalCents: number;
};

type UserTotalsRingChartProps = {
  items: UserTotalItem[];
  currency: string;
  tooltipByUser?: Record<
    string,
    Array<{ category: string; totalCents: number }>
  >;
  onUserClick?: (payload: { userLabel: string; totalCents: number }) => void;
};

const MAX_CATEGORIES = 4;

export function UserTotalsRingChart({
  items,
  currency,
  tooltipByUser,
  onUserClick,
}: UserTotalsRingChartProps) {
  const seriesData = useMemo<RingChartItem[]>(
    () =>
      items.map(item => ({
        name: item.user_label,
        value: item.totalCents,
      })),
    [items],
  );

  const handleItemClick = useCallback(
    (payload: RingChartItem) => {
      onUserClick?.({ userLabel: payload.name, totalCents: payload.value });
    },
    [onUserClick],
  );

  return (
    <RingChart
      items={seriesData}
      currency={currency}
      getTooltipLines={payload => {
        const breakdown = tooltipByUser?.[payload.name] ?? [];
        if (!breakdown.length) return [];
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
          maximumFractionDigits: currency === 'COP' ? 0 : 2,
        });
        const top = breakdown.slice(0, MAX_CATEGORIES);
        const rest = breakdown.slice(MAX_CATEGORIES);
        const lines = top.map(entry => {
          const value = entry.totalCents / (currency === 'COP' ? 1 : 100);
          return `${entry.category}: ${formatter.format(value)}`;
        });
        if (rest.length > 0) {
          const othersTotal = rest.reduce(
            (sum, entry) => sum + entry.totalCents,
            0,
          );
          const othersValue = othersTotal / (currency === 'COP' ? 1 : 100);
          lines.push(`Others: ${formatter.format(othersValue)}`);
        }
        return lines;
      }}
      onItemClick={handleItemClick}
    />
  );
}
