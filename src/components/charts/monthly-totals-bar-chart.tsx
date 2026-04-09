'use client';

import { formatCategoryLabel } from '@helpers/expenses-stats/aggregations';
import type { EChartsOption } from 'echarts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type EChartsType, echarts } from './echarts-init';
import { safeResize, safeSetOption } from './echarts-safe';

const THEME_NAME = 'momo';
const STROKE_COLOR = 'rgb(2, 0, 32)';
const STROKE_WIDTH = 2;
const BAR_MAX_WIDTH = 32;

type MonthEntry = {
  month: string;
  categories: Array<{ category: string; totalCents: number }>;
};

type MonthlyTotalsBarChartProps = {
  months: MonthEntry[];
  currency: string;
  onMonthClick?: (payload: { month: string; totalCents: number }) => void;
};

type ParsedMonth = {
  year: number;
  monthIndex: number;
};

function parseMonthKey(month: string): ParsedMonth | null {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function formatMonthKey(year: number, monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function buildMonthSeries(entries: MonthEntry[]) {
  if (!entries.length) {
    return {
      monthKeys: [] as string[],
      series: [] as Array<{ name: string; data: number[] }>,
      totals: [] as number[],
    };
  }

  const totalsByMonth = new Map<string, number>();
  const totalsByCategory = new Map<string, number>();
  const monthCategoryMap = new Map<string, Map<string, number>>();
  entries.forEach(entry => {
    const parsed = parseMonthKey(entry.month);
    if (!parsed) return;
    const key = formatMonthKey(parsed.year, parsed.monthIndex);

    const monthMap = monthCategoryMap.get(key) ?? new Map<string, number>();
    entry.categories.forEach(categoryEntry => {
      const value = categoryEntry.totalCents;
      monthMap.set(
        categoryEntry.category,
        (monthMap.get(categoryEntry.category) ?? 0) + value,
      );
      totalsByCategory.set(
        categoryEntry.category,
        (totalsByCategory.get(categoryEntry.category) ?? 0) + value,
      );
      totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + value);
    });
    monthCategoryMap.set(key, monthMap);
  });

  const sortedKeys = Array.from(totalsByMonth.keys()).sort();
  const first = parseMonthKey(sortedKeys[0]);
  const last = parseMonthKey(sortedKeys[sortedKeys.length - 1]);
  if (!first || !last) {
    return {
      monthKeys: sortedKeys,
      series: [],
      totals: sortedKeys.map(k => totalsByMonth.get(k) ?? 0),
    };
  }

  const topCategories = Array.from(totalsByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const othersLabel = 'Others';
  const seriesData = [
    ...topCategories.map(name => ({ name, data: [] as number[] })),
    { name: othersLabel, data: [] as number[] },
  ];

  const monthKeys: string[] = [];
  const totals: number[] = [];
  const cursor = new Date(first.year, first.monthIndex, 1);
  const end = new Date(last.year, last.monthIndex, 1);

  while (cursor <= end) {
    const key = formatMonthKey(cursor.getFullYear(), cursor.getMonth());
    const monthMap = monthCategoryMap.get(key) ?? new Map<string, number>();
    monthKeys.push(key);
    totals.push(totalsByMonth.get(key) ?? 0);
    let othersTotal = 0;

    topCategories.forEach((name, index) => {
      const value = monthMap.get(name) ?? 0;
      seriesData[index].data.push(value);
    });

    monthMap.forEach((value, name) => {
      if (!topCategories.includes(name)) {
        othersTotal += value;
      }
    });
    seriesData[seriesData.length - 1].data.push(othersTotal);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return { monthKeys, series: seriesData, totals };
}

function toDisplayAmount(amountCents: number, currency: string) {
  const divisor = currency === 'COP' ? 1 : 100;
  return amountCents / divisor;
}

function formatCompactCurrency(amount: number, currency: string) {
  const abs = Math.abs(amount);
  let suffix = '';
  let scaled = amount;

  if (abs >= 1_000_000_000) {
    scaled = amount / 1_000_000_000;
    suffix = 'B';
  } else if (abs >= 1_000_000) {
    scaled = amount / 1_000_000;
    suffix = 'M';
  } else if (abs >= 1_000) {
    scaled = amount / 1_000;
    suffix = 'K';
  }

  const maximumFractionDigits = abs >= 1_000 ? 1 : currency === 'COP' ? 0 : 2;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(scaled);

  return `${formatted}${suffix}`;
}

export function MonthlyTotalsBarChart({
  months,
  currency,
  onMonthClick,
}: MonthlyTotalsBarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const { monthKeys, series, totals } = useMemo(
    () => buildMonthSeries(months),
    [months],
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
        notation: 'compact',
        maximumFractionDigits: currency === 'COP' ? 0 : 2,
      }),
    [currency],
  );

  const labelMode = useMemo(() => {
    if (!monthKeys.length || !containerWidth) return 'short';
    const widthPerLabel = containerWidth / monthKeys.length;
    if (widthPerLabel < 36) return 'narrow';
    return 'short';
  }, [containerWidth, monthKeys.length]);

  const legendLayout = useMemo(() => {
    const rows = series.length > 3 ? 2 : 1;
    return {
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 6,
      right: 'auto',
      top: 'auto',
      gridRight: '6%',
      gridBottom: rows === 2 ? 64 : 44,
    };
  }, [series.length]);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: labelMode }),
    [labelMode],
  );

  const options = useMemo<EChartsOption>(() => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const payload = params as { seriesName?: string; value?: number };
          if (!payload || typeof payload.value !== 'number') return '';
          return `${payload.seriesName ?? ''} ${formatter.format(
            toDisplayAmount(payload.value, currency),
          )}`;
        },
      },
      legend: {
        show: true,
        icon: 'circle',
        itemHeight: 12,
        itemWidth: 12,
        itemGap: 10,
        data: series.map(item => item.name),
        itemStyle: {
          borderColor: STROKE_COLOR,
          borderWidth: STROKE_WIDTH,
        },
        formatter: (name: string) => formatCategoryLabel(name),
        ...legendLayout,
      },
      grid: {
        left: '10%',
        right: legendLayout.gridRight,
        top: 24,
        bottom: legendLayout.gridBottom,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: monthKeys,
        axisLine: {
          show: true,
          lineStyle: {
            color: STROKE_COLOR,
            width: STROKE_WIDTH,
          },
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: STROKE_COLOR,
            width: STROKE_WIDTH,
          },
        },
        axisLabel: {
          interval: 0,
          formatter: (value: string) => {
            const parsed = parseMonthKey(value);
            if (!parsed) return value;
            return monthFormatter.format(
              new Date(parsed.year, parsed.monthIndex, 1),
            );
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: STROKE_COLOR,
            width: STROKE_WIDTH,
          },
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: STROKE_COLOR,
            width: STROKE_WIDTH,
          },
        },
        axisLabel: {
          formatter: (value: number) =>
            formatCompactCurrency(toDisplayAmount(value, currency), currency),
        },
      },
      series: [
        ...series.map(item => ({
          name: item.name,
          type: 'bar' as const,
          stack: 'total',
          data: item.data,
          barMaxWidth: BAR_MAX_WIDTH,
          itemStyle: {
            borderWidth: 0,
          },
        })),
        {
          name: '__stack_outline__',
          type: 'custom' as const,
          data: totals.map((total, index) => [index, total]),
          renderItem: (_params, api) => {
            const xIndex = Number(api.value(0));
            const total = Number(api.value(1));
            if (!Number.isFinite(xIndex) || !Number.isFinite(total)) {
              return null;
            }
            if (total <= 0) return null;

            const top = api.coord([xIndex, total]);
            const bottom = api.coord([xIndex, 0]);
            const sizeFn = api.size;
            if (!sizeFn) return null;
            const size = sizeFn([1, 0]);
            const categoryWidth = Math.abs(
              Array.isArray(size) ? size[0] : size,
            );
            const barWidth = Math.min(BAR_MAX_WIDTH, categoryWidth * 0.72);
            const barLayout = api.barLayout;
            if (!barLayout) return null;
            const slots = barLayout({
              count: 1,
              barWidth,
            });
            const slot = slots[0];
            if (!slot) return null;
            const leftX = bottom[0] + slot.offset;
            const rightX = leftX + slot.width;

            return {
              type: 'polyline',
              shape: {
                points: [
                  [leftX, bottom[1]],
                  [leftX, top[1]],
                  [rightX, top[1]],
                  [rightX, bottom[1]],
                ],
              },
              style: {
                stroke: STROKE_COLOR,
                lineWidth: STROKE_WIDTH,
                fill: 'transparent',
              },
            };
          },
          encode: {
            x: 0,
            y: 1,
          },
          z: 11,
          silent: true,
          legendHoverLink: false,
          tooltip: {
            show: false,
          },
        },
      ],
    };
  }, [
    currency,
    formatter,
    legendLayout,
    monthFormatter,
    monthKeys,
    series,
    totals,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, THEME_NAME, {
      renderer: 'canvas',
    });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
      safeResize(chart, entry, 'MonthlyTotalsBarChart');
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    safeSetOption(chart, options, 'MonthlyTotalsBarChart', true);
  }, [options]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleClick = (params: unknown) => {
      const p = params as { name?: string; value?: number; dataIndex?: number };
      const index = p.dataIndex ?? -1;
      if (index < 0 || index >= monthKeys.length) return;
      const totalCents = totals[index] ?? 0;
      onMonthClick?.({ month: monthKeys[index], totalCents });
    };

    chart.on('click', handleClick);
    return () => {
      chart.off('click', handleClick);
    };
  }, [monthKeys, onMonthClick, totals]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
