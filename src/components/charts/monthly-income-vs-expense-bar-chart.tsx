'use client';

import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarGroup } from '@visx/shape';
import {
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { MonthlyCashflowPoint } from '@/lib/data/stats/types';
import styles from './monthly-income-vs-expense-bar-chart.module.css';
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
  makeMonthYearFormatter,
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
import { useTouchTooltipDismiss } from './shared/use-touch-tooltip';

export type MonthlyIncomeVsExpenseBarChartProps = {
  months: MonthlyCashflowPoint[];
  currency: string;
};

const BAR_MAX_WIDTH = 28;
const STROKE_WIDTH = 2;
const MARGIN = { top: 24, right: 16, bottom: 60, left: 56 } as const;
const LABEL_THRESHOLD = 40;

const SERIES_KEYS = ['Income', 'Expenses'] as const;
type SeriesKey = (typeof SERIES_KEYS)[number];

type GroupedDatum = {
  month: string;
  Income: number;
  Expenses: number;
};

type TooltipRow = {
  key: SeriesKey;
  color: string;
  value: string;
};

type TooltipDatum = {
  monthLabel: string;
  rows: TooltipRow[];
  net: string;
};

type CanvasProps = {
  width: number;
  height: number;
  months: MonthlyIncomeVsExpenseBarChartProps['months'];
  hidden: Set<SeriesKey>;
  currency: string;
  containerWidth: number;
};

function MonthlyIncomeVsExpenseCanvas({
  width,
  height,
  months,
  hidden,
  currency,
  containerWidth,
}: CanvasProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const monthKeys = useMemo(() => months.map(point => point.month), [months]);

  const seriesIndexByName = useMemo(() => {
    const map = new Map<SeriesKey, number>();
    SERIES_KEYS.forEach((name, index) => {
      map.set(name, index);
    });
    return map;
  }, []);

  // Visible keys still drive the BarGroup; hidden keys are stripped so they
  // produce no bars at all while preserving Income-first ordering.
  const visibleKeys = useMemo(
    () => SERIES_KEYS.filter(key => !hidden.has(key)),
    [hidden],
  );

  const groupedData = useMemo<GroupedDatum[]>(() => {
    return months.map(point => ({
      month: point.month,
      Income: point.incomeCents,
      Expenses: point.expenseCents,
    }));
  }, [months]);

  const yMax = useMemo(() => {
    const all: number[] = [];
    months.forEach(point => {
      if (!hidden.has('Income')) all.push(point.incomeCents);
      if (!hidden.has('Expenses')) all.push(point.expenseCents);
    });
    const max = Math.max(0, ...all);
    return max > 0 ? max : 1;
  }, [months, hidden]);

  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: monthKeys,
        range: [0, innerWidth],
        padding: 0.2,
      }),
    [monthKeys, innerWidth],
  );

  const x1Scale = useMemo(
    () =>
      scaleBand<SeriesKey>({
        domain: visibleKeys.length
          ? visibleKeys
          : (SERIES_KEYS as readonly SeriesKey[]).slice(),
        range: [0, xScale.bandwidth()],
        padding: 0.3,
      }),
    [visibleKeys, xScale],
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
    (key: SeriesKey) => paletteColor(seriesIndexByName.get(key) ?? 0),
    [seriesIndexByName],
  );

  const monthFormatter = useMemo(() => {
    const labelMode = pickLabelMode(
      containerWidth,
      monthKeys.length,
      LABEL_THRESHOLD,
    );
    return makeMonthFormatter(labelMode);
  }, [containerWidth, monthKeys.length]);

  const tooltipMonthFormatter = useMemo(() => makeMonthYearFormatter(), []);

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

  const handleTooltipPointer = useCallback(
    (
      event:
        | ReactPointerEvent<SVGRectElement>
        | ReactTouchEvent<SVGRectElement>,
    ) => {
      if (!monthKeys.length) return;
      const point = localPoint(event);
      if (!point) return;

      const innerX = point.x - MARGIN.left;
      if (innerX < 0 || innerX > innerWidth) {
        hideTooltip();
        return;
      }

      // Find the nearest month index by x band center.
      const half = xScale.bandwidth() / 2;
      let nearestIndex = 0;
      let minDelta = Number.POSITIVE_INFINITY;
      monthKeys.forEach((key, i) => {
        const center = (xScale(key) ?? 0) + half;
        const delta = Math.abs(center - innerX);
        if (delta < minDelta) {
          minDelta = delta;
          nearestIndex = i;
        }
      });

      const monthKey = monthKeys[nearestIndex];
      const monthPoint = months[nearestIndex];
      if (!monthKey || !monthPoint) return;

      const parsed = parseMonthKey(monthKey);
      const monthLabel = parsed
        ? tooltipMonthFormatter.format(
            new Date(parsed.year, parsed.monthIndex, 1),
          )
        : monthKey;

      const rows: TooltipRow[] = [];
      SERIES_KEYS.forEach(key => {
        if (hidden.has(key)) return;
        const value =
          key === 'Income' ? monthPoint.incomeCents : monthPoint.expenseCents;
        rows.push({
          key,
          color: colorFor(key),
          value: formatCurrency(toDisplayAmount(value, currency), currency),
        });
      });

      const net = formatCurrency(
        toDisplayAmount(
          monthPoint.incomeCents - monthPoint.expenseCents,
          currency,
        ),
        currency,
      );

      const px = (xScale(monthKey) ?? 0) + half + MARGIN.left;
      // Anchor at the higher visible bar top for better visual flow.
      const candidates: number[] = [];
      if (!hidden.has('Income')) candidates.push(monthPoint.incomeCents);
      if (!hidden.has('Expenses')) candidates.push(monthPoint.expenseCents);
      let py = MARGIN.top;
      if (candidates.length) {
        const anchor = Math.max(...candidates);
        py = (yScale(anchor) ?? 0) + MARGIN.top;
      }

      showTooltip({
        tooltipLeft: px,
        tooltipTop: py,
        tooltipData: { monthLabel, rows, net },
      });
    },
    [
      colorFor,
      currency,
      hidden,
      hideTooltip,
      innerWidth,
      monthKeys,
      months,
      showTooltip,
      tooltipMonthFormatter,
      xScale,
      yScale,
    ],
  );

  if (innerWidth <= 0 || innerHeight <= 0) {
    return <div ref={setContainerRef} className={styles.canvas} />;
  }

  return (
    <div ref={setContainerRef} className={styles.canvas}>
      <svg className={styles.svg} width={width} height={height}>
        <title>Monthly income vs expense bar chart</title>
        <Group top={MARGIN.top} left={MARGIN.left}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            numTicks={5}
            stroke={CHART_GRID}
            strokeWidth={1}
          />
          {visibleKeys.length > 0 ? (
            <BarGroup<GroupedDatum, SeriesKey>
              data={groupedData}
              keys={visibleKeys}
              height={innerHeight}
              x0={(d: GroupedDatum) => d.month}
              x0Scale={xScale}
              x1Scale={x1Scale}
              yScale={yScale}
              color={colorFor}
            >
              {barGroups =>
                barGroups.map(barGroup => (
                  <Group key={`bar-group-${barGroup.index}`} left={barGroup.x0}>
                    {barGroup.bars.map(bar => {
                      // Skip non-positive values entirely so grouped bars
                      // and outlines stay consistent.
                      if (bar.value <= 0) return null;
                      if (
                        !Number.isFinite(bar.x) ||
                        !Number.isFinite(bar.y) ||
                        bar.height <= 0
                      ) {
                        return null;
                      }
                      const slotWidth = bar.width;
                      const renderWidth = Math.min(slotWidth, BAR_MAX_WIDTH);
                      const renderX = bar.x + (slotWidth - renderWidth) / 2;
                      return (
                        <rect
                          key={`bar-${barGroup.index}-${String(bar.key)}`}
                          data-testid="grouped-bar"
                          data-series={String(bar.key)}
                          data-month={monthKeys[barGroup.index]}
                          x={renderX}
                          y={bar.y}
                          width={renderWidth}
                          height={bar.height}
                          fill={bar.color}
                          stroke={CHART_STROKE}
                          strokeWidth={STROKE_WIDTH}
                          shapeRendering="crispEdges"
                        />
                      );
                    })}
                  </Group>
                ))
              }
            </BarGroup>
          ) : null}
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
          <rect
            className={styles.pointerLayer}
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            onPointerDown={handleTooltipPointer}
            onPointerMove={handleTooltipPointer}
            onTouchStart={handleTooltipPointer}
            onTouchMove={handleTooltipPointer}
            onPointerLeave={event => {
              if (event.pointerType === 'touch') return;
              hideTooltip();
            }}
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
            <strong>{tooltipData.monthLabel}</strong>
          </div>
          {tooltipData.rows.map(row => (
            <div key={row.key} className={tooltipStyles.tooltipRow}>
              <span
                className={tooltipStyles.tooltipDot}
                style={{ background: row.color }}
              />
              <span>
                {row.key}: {row.value}
              </span>
            </div>
          ))}
          <div>
            <strong>Net: {tooltipData.net}</strong>
          </div>
        </TooltipInPortal>
      ) : null}
    </div>
  );
}

type LegendProps = {
  hidden: Set<SeriesKey>;
  toggle: (name: SeriesKey) => void;
};

function MonthlyIncomeVsExpenseLegend({ hidden, toggle }: LegendProps) {
  return (
    <ul
      className={legendStyles.legend}
      data-testid="monthly-income-vs-expense-legend"
    >
      {SERIES_KEYS.map((name, index) => {
        const isHidden = hidden.has(name);
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => toggle(name)}
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
              <span className={legendStyles.legendLabel}>{name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MonthlyIncomeVsExpenseBarChart({
  months,
  currency,
}: MonthlyIncomeVsExpenseBarChartProps) {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set());

  const toggle = useCallback((name: SeriesKey) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        return next;
      }
      // Don't allow hiding all series.
      const visibleCount = SERIES_KEYS.filter(k => !next.has(k)).length;
      if (visibleCount <= 1) return prev;
      next.add(name);
      return next;
    });
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.chartArea}>
        <ChartShell minWidth={1} minHeight={1}>
          {({ width, height }) => (
            <MonthlyIncomeVsExpenseCanvas
              width={width}
              height={height}
              months={months}
              hidden={hidden}
              currency={currency}
              containerWidth={width}
            />
          )}
        </ChartShell>
      </div>
      <MonthlyIncomeVsExpenseLegend hidden={hidden} toggle={toggle} />
    </div>
  );
}
