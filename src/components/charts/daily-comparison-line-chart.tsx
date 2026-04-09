'use client';

import type { EChartsOption } from 'echarts';
import { useEffect, useMemo, useRef } from 'react';

import { type EChartsType, echarts } from './echarts-init';

const THEME_NAME = 'momo';
const TOOLTIP_MARGIN = 8;
const STROKE_COLOR = 'rgb(2, 0, 32)';
const STROKE_WIDTH = 2;

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
  const persistentMarkerDay = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    if (day < 1 || day > maxDay) {
      return null;
    }

    return day;
  }, [maxDay]);

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

  const options = useMemo<EChartsOption>(() => {
    const tickLabels = new Set<number>([1, maxDay]);
    for (let day = 5; day < maxDay; day += 5) {
      tickLabels.add(day);
    }

    const currentMarkerData =
      persistentMarkerDay === null
        ? null
        : {
            name: 'today-marker-current',
            xAxis: persistentMarkerDay - 1,
            yAxis: currentValues[persistentMarkerDay - 1] ?? 0,
          };
    const previousMarkerData =
      persistentMarkerDay === null
        ? null
        : {
            name: 'today-marker-previous',
            xAxis: persistentMarkerDay - 1,
            yAxis: previousValues[persistentMarkerDay - 1] ?? 0,
          };
    const buildPersistentMarker = (
      markerData: { name: string; xAxis: number; yAxis: number } | null,
    ) =>
      markerData
        ? {
            data: [markerData],
            symbol: 'emptyCircle',
            symbolSize: 8,
            silent: true,
            label: {
              show: false,
            },
            tooltip: {
              show: false,
            },
            itemStyle: {
              borderWidth: 2,
              borderColor: STROKE_COLOR,
            },
            emphasis: {
              disabled: true,
            },
          }
        : undefined;

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        position: (
          point: number[],
          _params: unknown,
          _dom: unknown,
          _rect: unknown,
          size: { contentSize: number[]; viewSize: number[] },
        ) => {
          const [x, y] = point;
          const [contentWidth, contentHeight] = size.contentSize;
          const [viewWidth, viewHeight] = size.viewSize;

          const preferredX = x < viewWidth / 2 ? x + 12 : x - contentWidth - 12;
          const clampedX = Math.min(
            Math.max(preferredX, TOOLTIP_MARGIN),
            Math.max(TOOLTIP_MARGIN, viewWidth - contentWidth - TOOLTIP_MARGIN),
          );

          const preferredY =
            y < viewHeight / 2 ? y + 12 : y - contentHeight - 12;
          const clampedY = Math.min(
            Math.max(preferredY, TOOLTIP_MARGIN),
            Math.max(
              TOOLTIP_MARGIN,
              viewHeight - contentHeight - TOOLTIP_MARGIN,
            ),
          );

          return [clampedX, clampedY];
        },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [];
          const currentItem = items.find(
            item =>
              (item as { seriesName?: string }).seriesName === currentLabel,
          ) as { value?: number; color?: string } | undefined;
          const previousItem = items.find(
            item =>
              (item as { seriesName?: string }).seriesName === previousLabel,
          ) as { value?: number; color?: string } | undefined;

          const currentValue =
            typeof currentItem?.value === 'number' ? currentItem.value : 0;
          const previousValue =
            typeof previousItem?.value === 'number' ? previousItem.value : 0;

          const axisValue = items[0]?.axisValue ?? items[0]?.name;
          const dayLine = axisValue ? `<strong>Day ${axisValue}</strong>` : '';
          const formatLine = (
            label: string,
            color: string | undefined,
            value: number,
          ) => {
            const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color ?? '#000'};margin-right:6px;"></span>`;
            const spacer =
              '<span style="display:inline-block;width:10px;"></span>';
            return `${dot}<strong>${label}</strong>${spacer}${formatter.format(
              toDisplayAmount(value, currency),
            )}`;
          };
          const currentLine = formatLine(
            currentLabel,
            currentItem?.color,
            currentValue,
          );
          const previousLine = formatLine(
            previousLabel,
            previousItem?.color,
            previousValue,
          );

          return [dayLine, currentLine, previousLine]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      grid: {
        left: '10%',
        right: '6%',
        top: 24,
        bottom: 60,
        containLabel: true,
      },
      legend: {
        show: true,
        icon: 'circle',
        itemHeight: 12,
        itemWidth: 12,
        itemGap: 10,
        bottom: 10,
        left: 'center',
      },
      xAxis: {
        type: 'category',
        data: days,
        boundaryGap: false,
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
          formatter: (value: string | number) => {
            const day = Number(value);
            if (!Number.isFinite(day)) return '';
            return tickLabels.has(day) ? String(day) : '';
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
          name: currentLabel,
          type: 'line',
          data: currentValues,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: 'rgb(2, 0, 32)',
          },
          markPoint: buildPersistentMarker(currentMarkerData),
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
          lineStyle: {
            width: 3,
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: 'rgb(2, 0, 32)',
          },
          markPoint: buildPersistentMarker(previousMarkerData),
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
    persistentMarkerDay,
    previousLabel,
    previousValues,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

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
