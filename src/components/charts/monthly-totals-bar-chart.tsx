'use client';

import { formatCategoryLabel } from '@helpers/expenses-stats/aggregations';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarStack } from '@visx/shape';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import styles from './monthly-totals-bar-chart.module.css';
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_STROKE,
  paletteColor,
} from './shared/chart-colors';
import { ChartShell } from './shared/chart-shell';
import {
  formatCompactCurrency,
  formatCurrency,
  makeMonthFormatter,
  parseMonthKey,
  pickLabelMode,
  toDisplayAmount,
} from './shared/format';
import legendStyles from './shared/legend.module.css';
import { mergeRefs } from './shared/merge-refs';
import tooltipStyles from './shared/tooltip.module.css';
import {
  EMPTY_TOOLTIP_STYLE,
  useTooltipPortal,
} from './shared/use-tooltip-portal';
import {
  getTouchClientPoint,
  useTouchTooltipDismiss,
} from './shared/use-touch-tooltip';

const BAR_MAX_WIDTH = 32;
const STROKE_WIDTH = 2;
const MARGIN = { top: 24, right: 16, bottom: 64, left: 56 } as const;
const LABEL_THRESHOLD = 36;
const OTHERS_LABEL = 'Others';

export type MonthEntry = {
  month: string;
  categories: Array<{ category: string; totalCents: number }>;
};

export type MonthlyTotalsBarChartProps = {
  months: MonthEntry[];
  currency: string;
  onMonthClick?: (payload: { month: string; totalCents: number }) => void;
};

type SeriesAggregate = {
  monthKeys: string[];
  series: Array<{ name: string; data: number[] }>;
  totals: number[];
};

type StackDatum = {
  month: string;
  [key: string]: string | number;
};

type TooltipDatum = {
  seriesName: string;
  formatted: string;
};

function buildMonthSeries(entries: MonthEntry[]): SeriesAggregate {
  if (!entries.length) {
    return {
      monthKeys: [],
      series: [],
      totals: [],
    };
  }

  const totalsByMonth = new Map<string, number>();
  const totalsByCategory = new Map<string, number>();
  const monthCategoryMap = new Map<string, Map<string, number>>();
  entries.forEach(entry => {
    const parsed = parseMonthKey(entry.month);
    if (!parsed) return;
    const month = String(parsed.monthIndex + 1).padStart(2, '0');
    const key = `${parsed.year}-${month}`;

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

  const seriesData = [
    ...topCategories.map(name => ({ name, data: [] as number[] })),
    { name: OTHERS_LABEL, data: [] as number[] },
  ];

  const monthKeys: string[] = [];
  const totals: number[] = [];
  const cursor = new Date(first.year, first.monthIndex, 1);
  const end = new Date(last.year, last.monthIndex, 1);

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
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

type CanvasProps = {
  width: number;
  height: number;
  monthKeys: string[];
  series: Array<{ name: string; data: number[] }>;
  hidden: Set<string>;
  currency: string;
  containerWidth: number;
  onMonthClick?: MonthlyTotalsBarChartProps['onMonthClick'];
};

function MonthlyTotalsCanvas({
  width,
  height,
  monthKeys,
  series,
  hidden,
  currency,
  containerWidth,
  onMonthClick,
}: CanvasProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const seriesIndexByName = useMemo(() => {
    const map = new Map<string, number>();
    series.forEach((s, index) => {
      map.set(s.name, index);
    });
    return map;
  }, [series]);

  // Visible series only — hidden ones don't contribute to bars or to the
  // outline total per month.
  const visibleSeries = useMemo(
    () => series.filter(s => !hidden.has(s.name)),
    [series, hidden],
  );

  const visibleKeys = useMemo(
    () => visibleSeries.map(s => s.name),
    [visibleSeries],
  );

  const stackData = useMemo<StackDatum[]>(() => {
    return monthKeys.map((month, monthIndex) => {
      const row: StackDatum = { month };
      visibleSeries.forEach(s => {
        row[s.name] = s.data[monthIndex] ?? 0;
      });
      return row;
    });
  }, [monthKeys, visibleSeries]);

  const visibleTotals = useMemo(
    () =>
      monthKeys.map((_, monthIndex) =>
        visibleSeries.reduce((sum, s) => sum + (s.data[monthIndex] ?? 0), 0),
      ),
    [monthKeys, visibleSeries],
  );

  const yMax = useMemo(() => {
    const max = Math.max(0, ...visibleTotals);
    return max > 0 ? max : 1;
  }, [visibleTotals]);

  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: monthKeys,
        range: [0, innerWidth],
        padding: 0.4,
      }),
    [monthKeys, innerWidth],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, yMax],
        range: [innerHeight, 0],
        nice: true,
      }),
    [yMax, innerHeight],
  );

  const colorFor = useCallback(
    (key: string) => paletteColor(seriesIndexByName.get(key) ?? 0),
    [seriesIndexByName],
  );

  const bandwidth = xScale.bandwidth();
  const actualBarWidth = Math.min(bandwidth, BAR_MAX_WIDTH);
  const barXOffset = (bandwidth - actualBarWidth) / 2;

  const monthFormatter = useMemo(() => {
    const labelMode = pickLabelMode(
      containerWidth,
      monthKeys.length,
      LABEL_THRESHOLD,
    );
    return makeMonthFormatter(labelMode);
  }, [containerWidth, monthKeys.length]);

  const formatXAxisTick = useCallback(
    (value: string) => {
      const parsed = parseMonthKey(value);
      if (!parsed) return value;
      return monthFormatter.format(new Date(parsed.year, parsed.monthIndex, 1));
    },
    [monthFormatter],
  );

  const formatYAxisTick = useCallback(
    (value: { valueOf(): number }) => {
      const num = typeof value === 'number' ? value : value.valueOf();
      return formatCompactCurrency(toDisplayAmount(num, currency), currency);
    },
    [currency],
  );

  const tooltip = useTooltipPortal<TooltipDatum>();
  const {
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
    TooltipInPortal,
    containerRef: tooltipContainerRef,
  } = tooltip;

  const dismissContainerRef = useTouchTooltipDismiss({
    active: tooltipOpen,
    onDismiss: hideTooltip,
  });

  const setContainerRef = useMemo(
    () => mergeRefs<HTMLDivElement>(dismissContainerRef, tooltipContainerRef),
    [dismissContainerRef, tooltipContainerRef],
  );

  const showSegmentTooltip = useCallback(
    (seriesName: string, value: number, clientX: number, clientY: number) => {
      const container = dismissContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const formatted = formatCurrency(
        toDisplayAmount(value, currency),
        currency,
      );
      showTooltip({
        tooltipLeft: clientX - rect.left,
        tooltipTop: clientY - rect.top,
        tooltipData: { seriesName, formatted },
      });
    },
    [currency, dismissContainerRef, showTooltip],
  );

  const showSegmentTooltipFromTouch = useCallback(
    (
      seriesName: string,
      value: number,
      event: ReactTouchEvent<SVGRectElement>,
    ) => {
      const touchPoint = getTouchClientPoint(event);
      if (!touchPoint) return;
      showSegmentTooltip(
        seriesName,
        value,
        touchPoint.clientX,
        touchPoint.clientY,
      );
    },
    [showSegmentTooltip],
  );

  if (innerWidth <= 0 || innerHeight <= 0) {
    return <div ref={setContainerRef} className={styles.canvas} />;
  }

  return (
    <div ref={setContainerRef} className={styles.canvas}>
      <svg className={styles.svg} width={width} height={height}>
        <title>Monthly totals bar chart</title>
        <Group top={MARGIN.top} left={MARGIN.left}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            numTicks={5}
            stroke={CHART_GRID}
            strokeWidth={1}
          />
          {visibleKeys.length > 0 ? (
            <BarStack<StackDatum, string>
              data={stackData}
              keys={visibleKeys}
              x={(d: StackDatum) => d.month}
              xScale={xScale}
              yScale={yScale}
              color={colorFor}
            >
              {barStacks =>
                barStacks.map(barStack =>
                  barStack.bars.map(bar => {
                    if (
                      !Number.isFinite(bar.x) ||
                      !Number.isFinite(bar.y) ||
                      bar.height <= 0
                    ) {
                      return null;
                    }
                    const monthIndex = bar.index;
                    const monthKey = monthKeys[monthIndex];
                    return (
                      <rect
                        key={`bar-${barStack.key}-${monthKey}`}
                        data-testid="bar-segment"
                        data-series={barStack.key}
                        data-month={monthKey}
                        x={bar.x + barXOffset}
                        y={bar.y}
                        width={actualBarWidth}
                        height={bar.height}
                        fill={bar.color}
                        className={styles.bar}
                        onPointerEnter={event =>
                          showSegmentTooltip(
                            String(barStack.key),
                            bar.bar.data[barStack.key] as number,
                            event.clientX,
                            event.clientY,
                          )
                        }
                        onPointerDown={event =>
                          showSegmentTooltip(
                            String(barStack.key),
                            bar.bar.data[barStack.key] as number,
                            event.clientX,
                            event.clientY,
                          )
                        }
                        onPointerMove={event =>
                          showSegmentTooltip(
                            String(barStack.key),
                            bar.bar.data[barStack.key] as number,
                            event.clientX,
                            event.clientY,
                          )
                        }
                        onTouchStart={event =>
                          showSegmentTooltipFromTouch(
                            String(barStack.key),
                            bar.bar.data[barStack.key] as number,
                            event,
                          )
                        }
                        onTouchMove={event =>
                          showSegmentTooltipFromTouch(
                            String(barStack.key),
                            bar.bar.data[barStack.key] as number,
                            event,
                          )
                        }
                        onPointerLeave={event => {
                          if (event.pointerType === 'touch') return;
                          hideTooltip();
                        }}
                        onClick={() => {
                          if (!onMonthClick) return;
                          onMonthClick({
                            month: monthKey,
                            totalCents: visibleTotals[monthIndex] ?? 0,
                          });
                        }}
                      />
                    );
                  }),
                )
              }
            </BarStack>
          ) : null}
          {/* Stack outline pass: one rect per month wrapping the entire
              stacked group. Skip months whose total <= 0. */}
          {monthKeys.map((monthKey, monthIndex) => {
            const total = visibleTotals[monthIndex] ?? 0;
            if (total <= 0) return null;
            const bandX = xScale(monthKey);
            if (bandX === undefined) return null;
            const topY = yScale(total) ?? 0;
            const baseY = yScale(0) ?? innerHeight;
            const outlineHeight = baseY - topY;
            if (outlineHeight <= 0) return null;
            return (
              <rect
                key={`outline-${monthKey}`}
                data-testid="stack-outline"
                data-month={monthKey}
                x={bandX + barXOffset}
                y={topY}
                width={actualBarWidth}
                height={outlineHeight}
                fill="none"
                stroke={CHART_STROKE}
                strokeWidth={STROKE_WIDTH}
                shapeRendering="crispEdges"
                pointerEvents="none"
              />
            );
          })}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke={CHART_AXIS}
            strokeWidth={2}
            tickStroke={CHART_AXIS}
            tickFormat={formatXAxisTick}
            tickLabelProps={() => ({
              fontSize: 11,
              fontWeight: 600,
              fill: 'var(--fg-primary)',
              textAnchor: 'middle',
              dy: '0.25em',
            })}
          />
          <AxisLeft
            scale={yScale}
            stroke={CHART_AXIS}
            strokeWidth={2}
            tickStroke={CHART_AXIS}
            numTicks={5}
            tickFormat={formatYAxisTick}
            tickLabelProps={() => ({
              fontSize: 11,
              fontWeight: 600,
              fill: 'var(--fg-primary)',
              textAnchor: 'end',
              dx: '-0.25em',
              dy: '0.25em',
            })}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData ? (
        <TooltipInPortal
          left={tooltipLeft}
          top={tooltipTop}
          style={EMPTY_TOOLTIP_STYLE}
          applyPositionStyle
          className={tooltipStyles.tooltip}
        >
          <div>
            {formatCategoryLabel(tooltipData.seriesName)}{' '}
            {tooltipData.formatted}
          </div>
        </TooltipInPortal>
      ) : null}
    </div>
  );
}

type LegendProps = {
  series: Array<{ name: string }>;
  hidden: Set<string>;
  toggle: (name: string) => void;
  seriesIndexByName: Map<string, number>;
};

function MonthlyTotalsLegend({
  series,
  hidden,
  toggle,
  seriesIndexByName,
}: LegendProps) {
  return (
    <ul className={legendStyles.legend} data-testid="monthly-totals-legend">
      {series.map(item => {
        const isHidden = hidden.has(item.name);
        const index = seriesIndexByName.get(item.name) ?? 0;
        return (
          <li key={item.name}>
            <button
              type="button"
              onClick={() => toggle(item.name)}
              aria-pressed={!isHidden}
              className={`${legendStyles.legendItem} ${
                isHidden ? legendStyles.legendItemHidden : ''
              }`}
            >
              <span
                className={legendStyles.legendDot}
                style={{
                  background: isHidden ? 'transparent' : paletteColor(index),
                }}
              />
              <span className={legendStyles.legendLabel}>
                {formatCategoryLabel(item.name)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MonthlyTotalsBarChart({
  months,
  currency,
  onMonthClick,
}: MonthlyTotalsBarChartProps) {
  const { monthKeys, series } = useMemo(
    () => buildMonthSeries(months),
    [months],
  );

  const seriesIndexByName = useMemo(() => {
    const map = new Map<string, number>();
    series.forEach((s, index) => {
      map.set(s.name, index);
    });
    return map;
  }, [series]);

  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const toggle = useCallback(
    (name: string) => {
      setHidden(prev => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
          return next;
        }
        // Don't allow hiding all series.
        const visibleCount = series.filter(s => !next.has(s.name)).length;
        if (visibleCount <= 1) return prev;
        next.add(name);
        return next;
      });
    },
    [series],
  );

  return (
    <div className={styles.root}>
      <div className={styles.chartArea}>
        <ChartShell minWidth={1} minHeight={1}>
          {({ width, height }) => (
            <MonthlyTotalsCanvas
              width={width}
              height={height}
              monthKeys={monthKeys}
              series={series}
              hidden={hidden}
              currency={currency}
              containerWidth={width}
              onMonthClick={onMonthClick}
            />
          )}
        </ChartShell>
      </div>
      <MonthlyTotalsLegend
        series={series}
        hidden={hidden}
        toggle={toggle}
        seriesIndexByName={seriesIndexByName}
      />
    </div>
  );
}
