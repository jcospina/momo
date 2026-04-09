'use client';

import type { EChartsOption } from 'echarts';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MonthlyCashflowPoint } from '@/lib/data/stats/types';
import { type EChartsType, echarts } from './echarts-init';
import { safeResize, safeSetOption } from './echarts-safe';

const THEME_NAME = 'momo';
const STROKE_COLOR = 'rgb(2, 0, 32)';
const STROKE_WIDTH = 2;
const BAR_MAX_WIDTH = 28;
const BAR_GAP = '30%';
const BAR_CATEGORY_GAP = '20%';

type MonthlyIncomeVsExpenseBarChartProps = {
  months: MonthlyCashflowPoint[];
  currency: string;
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

function snapToPixel(value: number, dpr: number) {
  return Math.round(value * dpr) / dpr;
}

export function MonthlyIncomeVsExpenseBarChart({
  months,
  currency,
}: MonthlyIncomeVsExpenseBarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const monthKeys = useMemo(() => months.map(point => point.month), [months]);

  const monthFormatter = useMemo(() => {
    const widthPerLabel =
      monthKeys.length > 0 && containerWidth > 0
        ? containerWidth / monthKeys.length
        : 0;
    const labelMode =
      widthPerLabel > 0 && widthPerLabel < 40 ? 'narrow' : 'short';

    return new Intl.DateTimeFormat(undefined, {
      month: labelMode,
    });
  }, [containerWidth, monthKeys.length]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
        maximumFractionDigits: currency === 'COP' ? 0 : 2,
      }),
    [currency],
  );

  const tooltipMonthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }),
    [],
  );

  const options = useMemo<EChartsOption>(() => {
    const incomeValues = months.map(point => point.incomeCents);
    const expenseValues = months.map(point => point.expenseCents);
    const netValues = months.map(point => point.netCents);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: params => {
          const items = Array.isArray(params) ? params : [];
          if (!items.length) return '';

          const index = Number(items[0]?.dataIndex);
          const net = Number.isFinite(index) ? (netValues[index] ?? 0) : 0;
          const monthKey =
            Number.isFinite(index) && index >= 0
              ? (monthKeys[index] ?? '')
              : '';
          const parsedMonth = parseMonthKey(monthKey);
          const monthLabel = parsedMonth
            ? tooltipMonthFormatter.format(
                new Date(parsedMonth.year, parsedMonth.monthIndex, 1),
              )
            : monthKey;

          const rows = items
            .map(item => {
              const value = Number(item.value ?? 0);
              const marker = item.marker ?? '';
              return `${marker}${item.seriesName}: ${formatter.format(
                toDisplayAmount(value, currency),
              )}`;
            })
            .join('<br/>');

          return [
            `<strong>${monthLabel}</strong>`,
            rows,
            `Net: ${formatter.format(toDisplayAmount(net, currency))}`,
          ].join('<br/>');
        },
      },
      legend: {
        show: true,
        icon: 'circle',
        itemHeight: 12,
        itemWidth: 12,
        itemGap: 10,
        data: ['Income', 'Expenses'],
        left: 'center',
        bottom: 10,
      },
      grid: {
        left: '10%',
        right: '6%',
        top: 24,
        bottom: 60,
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
        {
          name: 'Income',
          type: 'bar' as const,
          data: incomeValues,
          barMaxWidth: BAR_MAX_WIDTH,
          barGap: BAR_GAP,
          barCategoryGap: BAR_CATEGORY_GAP,
          itemStyle: {
            borderWidth: 0,
          },
          emphasis: {
            focus: 'none',
          },
        },
        {
          name: 'Expenses',
          type: 'bar' as const,
          data: expenseValues,
          barMaxWidth: BAR_MAX_WIDTH,
          barGap: BAR_GAP,
          barCategoryGap: BAR_CATEGORY_GAP,
          itemStyle: {
            borderWidth: 0,
          },
          emphasis: {
            focus: 'none',
          },
        },
        {
          name: '__income_outline__',
          type: 'custom' as const,
          data: incomeValues.map((value, index) => [index, value]),
          renderItem: (_params, api) => {
            const xIndex = Number(api.value(0));
            const value = Number(api.value(1));
            if (!Number.isFinite(xIndex) || !Number.isFinite(value)) {
              return null;
            }
            if (value <= 0) return null;

            const top = api.coord([xIndex, value]);
            const bottom = api.coord([xIndex, 0]);
            const sizeFn = api.size;
            if (!sizeFn) return null;
            const size = sizeFn([1, 0]);
            const categoryWidth = Math.abs(
              Array.isArray(size) ? size[0] : size,
            );
            const slotWidth = Math.min(BAR_MAX_WIDTH, categoryWidth * 0.32);
            const barLayout = api.barLayout;
            if (!barLayout) return null;
            const slots = barLayout({
              count: 2,
              barMaxWidth: slotWidth,
              barGap: BAR_GAP,
              barCategoryGap: BAR_CATEGORY_GAP,
            });
            const slot = slots[0];
            if (!slot) return null;
            const dpr = api.getDevicePixelRatio();
            const centerX = bottom[0] + slot.offsetCenter;
            const leftX = snapToPixel(centerX - slot.width / 2, dpr);
            const rightX = snapToPixel(centerX + slot.width / 2, dpr);
            const topY = snapToPixel(top[1], dpr);
            const bottomY = snapToPixel(bottom[1], dpr);
            if (rightX <= leftX) return null;

            return {
              type: 'polyline',
              shape: {
                points: [
                  [leftX, bottomY],
                  [leftX, topY],
                  [rightX, topY],
                  [rightX, bottomY],
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
        {
          name: '__expenses_outline__',
          type: 'custom' as const,
          data: expenseValues.map((value, index) => [index, value]),
          renderItem: (_params, api) => {
            const xIndex = Number(api.value(0));
            const value = Number(api.value(1));
            if (!Number.isFinite(xIndex) || !Number.isFinite(value)) {
              return null;
            }
            if (value <= 0) return null;

            const top = api.coord([xIndex, value]);
            const bottom = api.coord([xIndex, 0]);
            const sizeFn = api.size;
            if (!sizeFn) return null;
            const size = sizeFn([1, 0]);
            const categoryWidth = Math.abs(
              Array.isArray(size) ? size[0] : size,
            );
            const slotWidth = Math.min(BAR_MAX_WIDTH, categoryWidth * 0.32);
            const barLayout = api.barLayout;
            if (!barLayout) return null;
            const slots = barLayout({
              count: 2,
              barMaxWidth: slotWidth,
              barGap: BAR_GAP,
              barCategoryGap: BAR_CATEGORY_GAP,
            });
            const slot = slots[1];
            if (!slot) return null;
            const dpr = api.getDevicePixelRatio();
            const centerX = bottom[0] + slot.offsetCenter;
            const leftX = snapToPixel(centerX - slot.width / 2, dpr);
            const rightX = snapToPixel(centerX + slot.width / 2, dpr);
            const topY = snapToPixel(top[1], dpr);
            const bottomY = snapToPixel(bottom[1], dpr);
            if (rightX <= leftX) return null;

            return {
              type: 'polyline',
              shape: {
                points: [
                  [leftX, bottomY],
                  [leftX, topY],
                  [rightX, topY],
                  [rightX, bottomY],
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
    monthFormatter,
    monthKeys,
    months,
    tooltipMonthFormatter,
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
      safeResize(chart, entry, 'MonthlyIncomeVsExpenseBarChart');
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
    safeSetOption(chart, options, 'MonthlyIncomeVsExpenseBarChart', true);
  }, [options]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
