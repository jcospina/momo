'use client';

import type { EChartsOption } from 'echarts';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CumulativeSavingsPoint } from '@/lib/data/stats/types';
import { type EChartsType, echarts } from './echarts-init';
import { safeResize, safeSetOption } from './echarts-safe';

const THEME_NAME = 'momo';

type CumulativeSavingsLineChartProps = {
  months: CumulativeSavingsPoint[];
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

type YAxisBounds = {
  min: number;
  max: number;
};

function buildYAxisBounds(values: number[]): YAxisBounds {
  if (!values.length) {
    return { min: -1, max: 1 };
  }

  const baseMin = Math.min(0, ...values);
  const baseMax = Math.max(0, ...values);

  if (baseMin === baseMax) {
    const padding = Math.max(Math.abs(baseMin) * 0.1, 1);
    return {
      min: baseMin - padding,
      max: baseMax + padding,
    };
  }

  const padding = Math.max((baseMax - baseMin) * 0.05, 1);
  return {
    min: baseMin - padding,
    max: baseMax + padding,
  };
}

export function CumulativeSavingsLineChart({
  months,
  currency,
}: CumulativeSavingsLineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const useSingleMonthSeries = months.length === 1;

  const chartMonths = useMemo(() => {
    if (!useSingleMonthSeries) return months;
    const point = months[0];
    return point ? [point, point] : [];
  }, [months, useSingleMonthSeries]);

  const monthKeys = useMemo(
    () => chartMonths.map(point => point.month),
    [chartMonths],
  );

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
    const cumulativeValues = chartMonths.map(point => point.cumulativeCents);
    const yAxisBounds = buildYAxisBounds(cumulativeValues);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: params => {
          const items = Array.isArray(params) ? params : [];
          const index = Number(items[0]?.dataIndex);
          if (!Number.isFinite(index) || index < 0) return '';

          const point = chartMonths[index];
          if (!point) return '';
          const parsedMonth = parseMonthKey(point.month);
          const monthLabel = parsedMonth
            ? tooltipMonthFormatter.format(
                new Date(parsedMonth.year, parsedMonth.monthIndex, 1),
              )
            : point.month;

          const cumulative = formatter.format(
            toDisplayAmount(point.cumulativeCents, currency),
          );
          const monthlyNet = formatter.format(
            toDisplayAmount(point.netCents, currency),
          );

          return [
            `<strong>${monthLabel}</strong>`,
            `Cumulative savings: ${cumulative}`,
            `Monthly net: ${monthlyNet}`,
          ].join('<br/>');
        },
      },
      grid: {
        left: '10%',
        right: '6%',
        top: 24,
        bottom: 48,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: monthKeys,
        boundaryGap: false,
        axisLabel: {
          interval: 0,
          formatter: (value: string, index: number) => {
            if (useSingleMonthSeries && index > 0) return '';
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
        min: yAxisBounds.min,
        max: yAxisBounds.max,
        axisLabel: {
          formatter: (value: number) =>
            formatCompactCurrency(toDisplayAmount(value, currency), currency),
        },
      },
      series: [
        {
          name: 'Cumulative savings',
          type: 'line',
          data: cumulativeValues,
          smooth: true,
          showSymbol: useSingleMonthSeries,
          symbolSize: useSingleMonthSeries ? 7 : 4,
          areaStyle: {
            opacity: 0.14,
          },
          emphasis: {
            focus: 'none',
          },
        },
      ],
    };
  }, [
    chartMonths,
    currency,
    formatter,
    monthFormatter,
    monthKeys,
    tooltipMonthFormatter,
    useSingleMonthSeries,
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
      safeResize(chart, entry, 'CumulativeSavingsLineChart');
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
    safeSetOption(chart, options, 'CumulativeSavingsLineChart', true);
  }, [options]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
