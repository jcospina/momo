'use client';

import { OTHERS_CATEGORY_KEY } from '@constants/expenses/categories';
import { useCategoryLabel } from '@hooks/use-category-label';
import { useCallback, useMemo } from 'react';
import { memberColorVar } from '@/lib/theme/color-vars';

import {
  RingChart,
  type RingChartItem,
  type RingChartTooltipLine,
} from './ring-chart';

type UserTotalItem = {
  /** Stable member key (user id, or name for legacy rows). */
  key?: string;
  user_label: string;
  totalCents: number;
  /** The member's fixed colour slot; members without one share a neutral. */
  color_slot?: number | null;
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
  const labelFor = useCategoryLabel();
  const seriesData = useMemo<RingChartItem[]>(
    () =>
      items.map(item => ({
        key: item.key ?? item.user_label,
        name: item.user_label,
        value: item.totalCents,
        // Same colour as the member's avatar in chat and on the profile.
        color: memberColorVar(item.color_slot),
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
        const breakdown = tooltipByUser?.[payload.key ?? payload.name] ?? [];
        if (!breakdown.length) return [];
        const formatter = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
          maximumFractionDigits: currency === 'COP' ? 0 : 2,
        });
        const top = breakdown.slice(0, MAX_CATEGORIES);
        const rest = breakdown.slice(MAX_CATEGORIES);
        const lines: RingChartTooltipLine[] = top.map(entry => {
          const value = entry.totalCents / (currency === 'COP' ? 1 : 100);
          return {
            label: labelFor(entry.category),
            value: formatter.format(value),
          };
        });
        if (rest.length > 0) {
          const othersTotal = rest.reduce(
            (sum, entry) => sum + entry.totalCents,
            0,
          );
          const othersValue = othersTotal / (currency === 'COP' ? 1 : 100);
          lines.push({
            label: labelFor(OTHERS_CATEGORY_KEY),
            value: formatter.format(othersValue),
          });
        }
        return lines;
      }}
      onItemClick={handleItemClick}
    />
  );
}
