'use client';

import type { EChartsOption, EChartsType } from 'echarts';
import * as echarts from 'echarts';
import { useEffect, useMemo, useRef } from 'react';

import chartTheme from './theme.json';

const THEME_NAME = 'momo';
let themeRegistered = false;

function ensureThemeRegistered() {
  if (!themeRegistered && typeof window !== 'undefined') {
    echarts.registerTheme(THEME_NAME, chartTheme);
    themeRegistered = true;
  }
}

type DailyPoint = {
  day: number;
  totalCents: number;
};

type DailyComparisonLineChartProps = {
  monthLabel: string;
  current: DailyPoint[];
  previous: DailyPoint[];
  currency: string;
};

function toDisplayAmount(amountCents: number, currency: string) {
  const divisor = currency === 'COP' ? 1 : 100;
  return amountCents / divisor;
}

function getMonthLabels(monthLabel: string) {
  const parsed = new Date(`${monthLabel} 1`);
  if (Number.isNaN(parsed.getTime())) {
    return { current: monthLabel, previous: 'Previous' };
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  });
  const current = formatter.format(parsed);
  const previousDate = new Date(parsed);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previous = formatter.format(previousDate);

  return { current, previous };
}

function buildSeries(points: DailyPoint[], maxDay: number) {
  const map = new Map<number, number>();
  points.forEach(point => {
    if (point.day < 1 || point.day > maxDay) return;
    map.set(point.day, point.totalCents);
  });

  const values: number[] = [];
  let last = 0;
  for (let day = 1; day <= maxDay; day += 1) {
    const value = map.get(day);
    if (value === undefined) {
      values.push(last);
    } else {
      last = value;
      values.push(value);
    }
  }

  return values;
}

export function DailyComparisonLineChart({
  monthLabel,
  current,
  previous,
  currency,
}: DailyComparisonLineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  const maxDay = useMemo(() => {
    const maxCurrent = Math.max(0, ...current.map(point => point.day));
    const maxPrevious = Math.max(0, ...previous.map(point => point.day));
    const result = Math.max(maxCurrent, maxPrevious);
    return result > 0 ? result : 30;
  }, [current, previous]);

  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, index) => index + 1),
    [maxDay],
  );

  const { currentLabel, previousLabel } = useMemo(() => {
    const labels = getMonthLabels(monthLabel);
    return {
      currentLabel: labels.current,
      previousLabel: labels.previous,
    };
  }, [monthLabel]);

  const currentValues = useMemo(
    () => buildSeries(current, maxDay),
    [current, maxDay],
  );
  const previousValues = useMemo(
    () => buildSeries(previous, maxDay),
    [previous, maxDay],
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'COP' ? 0 : 2,
      }),
    [currency],
  );

  const options = useMemo<EChartsOption>(() => {
    const tickLabels = new Set<number>([1, maxDay]);
    for (let day = 5; day < maxDay; day += 5) {
      tickLabels.add(day);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [];
          const currentItem = items.find(
            item =>
              (item as { seriesName?: string }).seriesName === currentLabel,
          ) as { value?: number } | undefined;
          const previousItem = items.find(
            item =>
              (item as { seriesName?: string }).seriesName === previousLabel,
          ) as { value?: number } | undefined;

          const currentValue =
            typeof currentItem?.value === 'number' ? currentItem.value : 0;
          const previousValue =
            typeof previousItem?.value === 'number' ? previousItem.value : 0;

          const currentLine = `${currentLabel} ${formatter.format(
            toDisplayAmount(currentValue, currency),
          )}`;
          const previousLine = `${previousLabel} ${formatter.format(
            toDisplayAmount(previousValue, currency),
          )}`;

          return `${currentLine}<br/>${previousLine}`;
        },
      },
      grid: {
        left: '10%',
        right: '6%',
        top: 24,
        bottom: 36,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: days,
        boundaryGap: false,
        axisLabel: {
          formatter: (value: string | number) => {
            const day = Number(value);
            if (!Number.isFinite(day)) return '';
            return tickLabels.has(day) ? String(day) : '';
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) =>
            formatter.format(toDisplayAmount(value, currency)),
        },
      },
      series: [
        {
          name: currentLabel,
          type: 'line',
          data: currentValues,
          smooth: true,
          showSymbol: false,
          emphasis: {
            focus: 'none',
          },
        },
        {
          name: previousLabel,
          type: 'line',
          data: previousValues,
          smooth: true,
          showSymbol: false,
          emphasis: {
            focus: 'none',
          },
        },
      ],
    };
  }, [
    currency,
    currentLabel,
    currentValues,
    days,
    formatter,
    maxDay,
    previousLabel,
    previousValues,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    ensureThemeRegistered();

    const chart = echarts.init(containerRef.current, THEME_NAME, {
      renderer: 'canvas',
    });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
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
    chart.setOption(options);
  }, [options]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
