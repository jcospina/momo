'use client';

import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AreaClosed, Circle, Line, LinePath } from '@visx/shape';
import {
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CumulativeSavingsPoint } from '@/lib/data/stats/types';
import styles from './cumulative-savings-line-chart.module.css';
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_STROKE,
  paletteColor,
} from './shared/chart-colors';
import { ChartShell } from './shared/chart-shell';
import {
  buildYAxisBounds,
  formatCompactCurrency,
  formatCurrency,
  makeMonthFormatter,
  makeMonthYearFormatter,
  parseMonthKey,
  pickLabelMode,
  toDisplayAmount,
} from './shared/format';
import { mergeRefs } from './shared/merge-refs';
import tooltipStyles from './shared/tooltip.module.css';
import {
  EMPTY_TOOLTIP_STYLE,
  useTooltipPortal,
} from './shared/use-tooltip-portal';
import { useTouchTooltipDismiss } from './shared/use-touch-tooltip';

export type CumulativeSavingsLineChartProps = {
  months: CumulativeSavingsPoint[];
  currency: string;
};

type TooltipDatum = {
  monthLabel: string;
  cumulative: string;
  monthlyNet: string;
};

const MARGIN = { top: 24, right: 24, bottom: 48, left: 56 } as const;

type CanvasProps = {
  width: number;
  height: number;
  chartMonths: CumulativeSavingsPoint[];
  monthKeys: string[];
  currency: string;
  containerWidth: number;
  isSingleMonth: boolean;
};

function CumulativeSavingsCanvas({
  width,
  height,
  chartMonths,
  monthKeys,
  currency,
  containerWidth,
  isSingleMonth,
}: CanvasProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const cumulativeValues = useMemo(
    () => chartMonths.map(point => point.cumulativeCents),
    [chartMonths],
  );

  const yBounds = useMemo(
    () => buildYAxisBounds(cumulativeValues),
    [cumulativeValues],
  );

  // Use index-based domain so the duplicate-month single-point case (where
  // monthKeys would otherwise collide) still produces two distinct positions.
  const indexDomain = useMemo(() => monthKeys.map((_, i) => i), [monthKeys]);

  const xScale = useMemo(
    () =>
      scalePoint<number>({
        domain: indexDomain,
        range: [0, innerWidth],
      }),
    [indexDomain, innerWidth],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [yBounds.min, yBounds.max],
        range: [innerHeight, 0],
      }),
    [yBounds.min, yBounds.max, innerHeight],
  );

  const monthFormatter = useMemo(() => {
    const labelMode = pickLabelMode(containerWidth, monthKeys.length);
    return makeMonthFormatter(labelMode);
  }, [containerWidth, monthKeys.length]);

  const tooltipMonthFormatter = useMemo(() => makeMonthYearFormatter(), []);

  const formatXAxisTick = useCallback(
    (value: number) => {
      const index = Number(value);
      if (isSingleMonth && index > 0) return '';
      const monthKey = monthKeys[index];
      if (!monthKey) return '';
      const parsed = parseMonthKey(monthKey);
      if (!parsed) return monthKey;
      return monthFormatter.format(new Date(parsed.year, parsed.monthIndex, 1));
    },
    [isSingleMonth, monthFormatter, monthKeys],
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

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!tooltipOpen) setHoverIndex(null);
  }, [tooltipOpen]);

  const handleTooltipPointer = useCallback(
    (
      event:
        | ReactPointerEvent<SVGRectElement>
        | ReactTouchEvent<SVGRectElement>,
    ) => {
      if (!chartMonths.length) return;
      const point = localPoint(event);
      if (!point) return;

      // localPoint coords are relative to the SVG root; convert to inner-grid x.
      const innerX = point.x - MARGIN.left;
      if (innerX < 0 || innerX > innerWidth) {
        hideTooltip();
        setHoverIndex(null);
        return;
      }

      // Find nearest month index.
      const positions = indexDomain.map(i => xScale(i) ?? 0);
      let nearest = 0;
      let minDelta = Number.POSITIVE_INFINITY;
      positions.forEach((px, i) => {
        const delta = Math.abs(px - innerX);
        if (delta < minDelta) {
          minDelta = delta;
          nearest = i;
        }
      });

      const datum = chartMonths[nearest];
      if (!datum) return;
      setHoverIndex(nearest);

      const parsed = parseMonthKey(datum.month);
      const monthLabel = parsed
        ? tooltipMonthFormatter.format(
            new Date(parsed.year, parsed.monthIndex, 1),
          )
        : datum.month;

      const cumulative = formatCurrency(
        toDisplayAmount(datum.cumulativeCents, currency),
        currency,
      );
      const monthlyNet = formatCurrency(
        toDisplayAmount(datum.netCents, currency),
        currency,
      );

      const px = (xScale(nearest) ?? 0) + MARGIN.left;
      const py = (yScale(datum.cumulativeCents) ?? 0) + MARGIN.top;

      showTooltip({
        tooltipLeft: px,
        tooltipTop: py,
        tooltipData: { monthLabel, cumulative, monthlyNet },
      });
    },
    [
      chartMonths,
      currency,
      hideTooltip,
      indexDomain,
      innerWidth,
      showTooltip,
      tooltipMonthFormatter,
      xScale,
      yScale,
    ],
  );

  if (innerWidth <= 0 || innerHeight <= 0) {
    return <div ref={setContainerRef} className={styles.canvas} />;
  }

  const lineColor = paletteColor(0);

  return (
    <div ref={setContainerRef} className={styles.canvas}>
      <svg className={styles.svg} width={width} height={height}>
        <title>Cumulative savings line chart</title>
        <Group top={MARGIN.top} left={MARGIN.left}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            numTicks={5}
            stroke={CHART_GRID}
            strokeWidth={1}
          />
          {hoverIndex !== null ? (
            <Line
              from={{ x: xScale(hoverIndex) ?? 0, y: 0 }}
              to={{ x: xScale(hoverIndex) ?? 0, y: innerHeight }}
              stroke={CHART_STROKE}
              strokeWidth={2}
              strokeDasharray="4 4"
              pointerEvents="none"
              data-testid="hover-crosshair"
            />
          ) : null}
          <AreaClosed<CumulativeSavingsPoint>
            data={chartMonths}
            x={(_d, i) => xScale(i) ?? 0}
            y={d => yScale(d.cumulativeCents) ?? 0}
            yScale={yScale}
            curve={curveMonotoneX}
            fill={lineColor}
            fillOpacity={0.14}
            className={styles.area}
          />
          <LinePath<CumulativeSavingsPoint>
            data={chartMonths}
            x={(_d, i) => xScale(i) ?? 0}
            y={d => yScale(d.cumulativeCents) ?? 0}
            curve={curveMonotoneX}
            stroke={lineColor}
            strokeWidth={3}
            className={styles.line}
          />
          {isSingleMonth
            ? chartMonths.map((d, i) => (
                <Circle
                  key={`symbol-${i}`}
                  cx={xScale(i) ?? 0}
                  cy={yScale(d.cumulativeCents) ?? 0}
                  r={7}
                  stroke={CHART_STROKE}
                  strokeWidth={2}
                  fill="none"
                  className={styles.symbol}
                />
              ))
            : null}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke={CHART_AXIS}
            strokeWidth={2}
            tickStroke={CHART_AXIS}
            tickValues={indexDomain}
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
          {/* Pointer-capture rect — sits on top of the chart geometry to
              receive pointermove anywhere inside the inner grid. */}
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
              setHoverIndex(null);
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
          <div>Cumulative savings: {tooltipData.cumulative}</div>
          <div>Monthly net: {tooltipData.monthlyNet}</div>
        </TooltipInPortal>
      ) : null}
    </div>
  );
}

export function CumulativeSavingsLineChart({
  months,
  currency,
}: CumulativeSavingsLineChartProps) {
  const isSingleMonth = months.length === 1;

  const chartMonths = useMemo<CumulativeSavingsPoint[]>(() => {
    if (!isSingleMonth) return months;
    const point = months[0];
    return point ? [point, point] : [];
  }, [months, isSingleMonth]);

  const monthKeys = useMemo(
    () => chartMonths.map(point => point.month),
    [chartMonths],
  );

  return (
    <div className={styles.root}>
      <ChartShell minWidth={1} minHeight={1}>
        {({ width, height }) => (
          <CumulativeSavingsCanvas
            width={width}
            height={height}
            chartMonths={chartMonths}
            monthKeys={monthKeys}
            currency={currency}
            containerWidth={width}
            isSingleMonth={isSingleMonth}
          />
        )}
      </ChartShell>
    </div>
  );
}
