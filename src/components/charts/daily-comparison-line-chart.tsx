'use client';

import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { Circle, Line, LinePath } from '@visx/shape';
import {
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styles from './daily-comparison-line-chart.module.css';
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_STROKE,
  CHART_TOOLTIP_BG,
  paletteColor,
} from './shared/chart-colors';
import { ChartShell } from './shared/chart-shell';
import {
  formatCompactCurrency,
  formatCurrency,
  forwardFillDays,
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

type DailyPoint = {
  day: number;
  totalCents: number;
};

export type DailyComparisonLineChartProps = {
  monthLabel: string;
  current: DailyPoint[];
  previous: DailyPoint[];
  currency: string;
};

type SeriesKey = 'current' | 'previous';

type SeriesPoint = {
  day: number;
  value: number;
};

type TooltipDatum = {
  day: number;
  rows: Array<{
    key: SeriesKey;
    label: string;
    color: string;
    value: string;
  }>;
};

const MARGIN = { top: 24, right: 16, bottom: 60, left: 56 } as const;

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

type CanvasProps = {
  width: number;
  height: number;
  days: number[];
  maxDay: number;
  currentSeries: SeriesPoint[];
  previousSeries: SeriesPoint[];
  currentLabel: string;
  previousLabel: string;
  currency: string;
  persistentMarkerDay: number | null;
  hidden: Record<SeriesKey, boolean>;
};

function DailyComparisonCanvas({
  width,
  height,
  days,
  maxDay,
  currentSeries,
  previousSeries,
  currentLabel,
  previousLabel,
  currency,
  persistentMarkerDay,
  hidden,
}: CanvasProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const yMax = useMemo(() => {
    const allValues = [
      ...currentSeries.map(p => p.value),
      ...previousSeries.map(p => p.value),
    ];
    const maxValue = Math.max(0, ...allValues);
    if (maxValue === 0) return 1;
    return maxValue * 1.05;
  }, [currentSeries, previousSeries]);

  const xScale = useMemo(
    () =>
      scalePoint<number>({
        domain: days,
        range: [0, innerWidth],
      }),
    [days, innerWidth],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, yMax],
        range: [innerHeight, 0],
      }),
    [yMax, innerHeight],
  );

  const tickValues = useMemo(() => {
    const set = new Set<number>([1, maxDay]);
    for (let day = 5; day < maxDay; day += 5) {
      set.add(day);
    }
    return set;
  }, [maxDay]);

  const formatXAxisTick = useCallback(
    (value: { valueOf(): number }) => {
      const day = Number(typeof value === 'number' ? value : value.valueOf());
      if (!Number.isFinite(day)) return '';
      return tickValues.has(day) ? String(day) : '';
    },
    [tickValues],
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

  const [hoverDay, setHoverDay] = useState<number | null>(null);

  // Reset the dashed crosshair line when the tooltip closes (including via
  // outside-tap dismiss on touch — `onPointerLeave` is skipped for touch).
  useEffect(() => {
    if (!tooltipOpen) setHoverDay(null);
  }, [tooltipOpen]);

  const currentColor = paletteColor(0);
  const previousColor = paletteColor(1);

  const handleTooltipPointer = useCallback(
    (
      event:
        | ReactPointerEvent<SVGRectElement>
        | ReactTouchEvent<SVGRectElement>,
    ) => {
      if (!days.length) return;
      const point = localPoint(event);
      if (!point) return;

      const innerX = point.x - MARGIN.left;
      if (innerX < 0 || innerX > innerWidth) {
        hideTooltip();
        setHoverDay(null);
        return;
      }

      // Find the nearest day index by x position.
      const positions = days.map(d => xScale(d) ?? 0);
      let nearestIndex = 0;
      let minDelta = Number.POSITIVE_INFINITY;
      positions.forEach((px, i) => {
        const delta = Math.abs(px - innerX);
        if (delta < minDelta) {
          minDelta = delta;
          nearestIndex = i;
        }
      });

      const day = days[nearestIndex];
      if (day === undefined) return;
      setHoverDay(day);

      const rows: TooltipDatum['rows'] = [];
      if (!hidden.current) {
        const v = currentSeries[nearestIndex]?.value ?? 0;
        rows.push({
          key: 'current',
          label: currentLabel,
          color: currentColor,
          value: formatCurrency(toDisplayAmount(v, currency), currency),
        });
      }
      if (!hidden.previous) {
        const v = previousSeries[nearestIndex]?.value ?? 0;
        rows.push({
          key: 'previous',
          label: previousLabel,
          color: previousColor,
          value: formatCurrency(toDisplayAmount(v, currency), currency),
        });
      }

      const px = (xScale(day) ?? 0) + MARGIN.left;
      // Anchor to the higher of the two visible series for better visual flow.
      let py = MARGIN.top;
      const candidates: number[] = [];
      if (!hidden.current) {
        candidates.push(currentSeries[nearestIndex]?.value ?? 0);
      }
      if (!hidden.previous) {
        candidates.push(previousSeries[nearestIndex]?.value ?? 0);
      }
      if (candidates.length) {
        const anchor = Math.max(...candidates);
        py = (yScale(anchor) ?? 0) + MARGIN.top;
      }

      showTooltip({
        tooltipLeft: px,
        tooltipTop: py,
        tooltipData: { day, rows },
      });
    },
    [
      currency,
      currentColor,
      currentLabel,
      currentSeries,
      days,
      hidden.current,
      hidden.previous,
      hideTooltip,
      innerWidth,
      previousColor,
      previousLabel,
      previousSeries,
      showTooltip,
      xScale,
      yScale,
    ],
  );

  if (innerWidth <= 0 || innerHeight <= 0) {
    return <div ref={setContainerRef} className={styles.canvas} />;
  }

  const markerCurrentValue =
    persistentMarkerDay !== null
      ? (currentSeries[persistentMarkerDay - 1]?.value ?? 0)
      : 0;
  const markerPreviousValue =
    persistentMarkerDay !== null
      ? (previousSeries[persistentMarkerDay - 1]?.value ?? 0)
      : 0;

  return (
    <div ref={setContainerRef} className={styles.canvas}>
      <svg className={styles.svg} width={width} height={height}>
        <title>Daily comparison line chart</title>
        <Group top={MARGIN.top} left={MARGIN.left}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            numTicks={5}
            stroke={CHART_GRID}
            strokeWidth={1}
          />
          {hoverDay !== null ? (
            <Line
              from={{ x: xScale(hoverDay) ?? 0, y: 0 }}
              to={{ x: xScale(hoverDay) ?? 0, y: innerHeight }}
              stroke={CHART_STROKE}
              strokeWidth={2}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          ) : null}
          {!hidden.current ? (
            <LinePath<SeriesPoint>
              data={currentSeries}
              x={d => xScale(d.day) ?? 0}
              y={d => yScale(d.value) ?? 0}
              curve={curveMonotoneX}
              stroke={currentColor}
              strokeWidth={3}
              fill="none"
              data-testid="line-current"
            />
          ) : null}
          {!hidden.previous ? (
            <LinePath<SeriesPoint>
              data={previousSeries}
              x={d => xScale(d.day) ?? 0}
              y={d => yScale(d.value) ?? 0}
              curve={curveMonotoneX}
              stroke={previousColor}
              strokeWidth={3}
              fill="none"
              data-testid="line-previous"
            />
          ) : null}
          {persistentMarkerDay !== null && !hidden.current ? (
            <Circle
              data-testid="marker-current"
              cx={xScale(persistentMarkerDay) ?? 0}
              cy={yScale(markerCurrentValue) ?? 0}
              r={5}
              fill={CHART_TOOLTIP_BG}
              stroke={CHART_STROKE}
              strokeWidth={2}
              pointerEvents="none"
            />
          ) : null}
          {persistentMarkerDay !== null && !hidden.previous ? (
            <Circle
              data-testid="marker-previous"
              cx={xScale(persistentMarkerDay) ?? 0}
              cy={yScale(markerPreviousValue) ?? 0}
              r={5}
              fill={CHART_TOOLTIP_BG}
              stroke={CHART_STROKE}
              strokeWidth={2}
              pointerEvents="none"
            />
          ) : null}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke={CHART_AXIS}
            strokeWidth={2}
            tickStroke={CHART_AXIS}
            tickValues={days}
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
              setHoverDay(null);
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
            <strong>Day {tooltipData.day}</strong>
          </div>
          {tooltipData.rows.map(row => (
            <div key={row.key} className={tooltipStyles.tooltipRow}>
              <span
                className={tooltipStyles.tooltipDot}
                style={{ background: row.color }}
              />
              <strong>{row.label}</strong>
              <span>{row.value}</span>
            </div>
          ))}
        </TooltipInPortal>
      ) : null}
    </div>
  );
}

export function DailyComparisonLineChart({
  monthLabel,
  current,
  previous,
  currency,
}: DailyComparisonLineChartProps) {
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

  const currentSeries = useMemo<SeriesPoint[]>(() => {
    const filled = forwardFillDays(
      current.map(p => ({ day: p.day, totalCents: p.totalCents })),
      maxDay,
    );
    return filled.map((value, i) => ({ day: i + 1, value }));
  }, [current, maxDay]);

  const previousSeries = useMemo<SeriesPoint[]>(() => {
    const filled = forwardFillDays(
      previous.map(p => ({ day: p.day, totalCents: p.totalCents })),
      maxDay,
    );
    return filled.map((value, i) => ({ day: i + 1, value }));
  }, [previous, maxDay]);

  const persistentMarkerDay = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    if (day < 1 || day > maxDay) {
      return null;
    }
    return day;
  }, [maxDay]);

  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({
    current: false,
    previous: false,
  });

  const toggleSeries = useCallback((key: SeriesKey) => {
    setHidden(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Don't allow hiding both lines.
      if (next.current && next.previous) return prev;
      return next;
    });
  }, []);

  const currentColor = paletteColor(0);
  const previousColor = paletteColor(1);

  return (
    <div className={styles.root}>
      <div className={styles.chartArea}>
        <ChartShell minWidth={1} minHeight={1}>
          {({ width, height }) => (
            <DailyComparisonCanvas
              width={width}
              height={height}
              days={days}
              maxDay={maxDay}
              currentSeries={currentSeries}
              previousSeries={previousSeries}
              currentLabel={currentLabel}
              previousLabel={previousLabel}
              currency={currency}
              persistentMarkerDay={persistentMarkerDay}
              hidden={hidden}
            />
          )}
        </ChartShell>
      </div>
      <ul className={legendStyles.legend} data-testid="daily-comparison-legend">
        <li>
          <button
            type="button"
            onClick={() => toggleSeries('current')}
            aria-pressed={!hidden.current}
            className={`${legendStyles.legendItem} ${hidden.current ? legendStyles.legendItemHidden : ''}`}
          >
            <span
              className={legendStyles.legendDot}
              style={{
                background: hidden.current ? 'transparent' : currentColor,
              }}
            />
            <span className={legendStyles.legendLabel}>{currentLabel}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => toggleSeries('previous')}
            aria-pressed={!hidden.previous}
            className={`${legendStyles.legendItem} ${hidden.previous ? legendStyles.legendItemHidden : ''}`}
          >
            <span
              className={legendStyles.legendDot}
              style={{
                background: hidden.previous ? 'transparent' : previousColor,
              }}
            />
            <span className={legendStyles.legendLabel}>{previousLabel}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
