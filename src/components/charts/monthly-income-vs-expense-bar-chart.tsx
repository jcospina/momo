'use client';

import type { EChartsOption } from 'echarts';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MonthlyCashflowPoint } from '@/lib/data/stats/types';
import { type EChartsType, echarts } from './echarts-init';
import { safeResize, safeSetOption } from './echarts-safe';

const THEME_NAME = 'momo';

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
        axisLabel: {
          formatter: (value: number) =>
            formatCompactCurrency(toDisplayAmount(value, currency), currency),
        },
      },
      series: [
        {
          name: 'Income',
          type: 'bar',
          data: incomeValues,
          barMaxWidth: 28,
          emphasis: {
            focus: 'none',
          },
        },
        {
          name: 'Expenses',
          type: 'bar',
          data: expenseValues,
          barMaxWidth: 28,
          emphasis: {
            focus: 'none',
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
