'use client';

import { Group } from '@visx/group';
import { Pie, type PieProvidedProps } from '@visx/shape';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './ring-chart.module.css';
import { CHART_STROKE, paletteColor } from './shared/chart-colors';
import { ChartShell } from './shared/chart-shell';
import { formatCurrency, toDisplayAmount } from './shared/format';
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

export type RingChartItem = {
  name: string;
  value: number;
};

export type RingChartProps = {
  items: RingChartItem[];
  currency: string;
  centerLabel?: string;
  onItemClick?: (payload: RingChartItem) => void;
  getTooltipLines?: (payload: RingChartItem) => string[];
};

type ArcDatum = {
  name: string;
  value: number;
  paletteIndex: number;
};

type TooltipDatum = {
  name: string;
  value: number;
  percent: number;
  extra: string[];
};

type PieArcDatum<Datum> = PieProvidedProps<Datum>['arcs'][number];

type Layout = {
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
};

const STROKE_WIDTH = 2;
const PAD_ANGLE = 0.01;
const CORNER_RADIUS = 6;
const ANIMATION_DURATION_MS = 450;

function computeLayout(width: number, height: number): Layout {
  // Donut is always centered; legend is always rendered below in a wrapping
  // row, so the canvas is fully available for the donut.
  const basis = Math.min(width, height);
  const innerRadius = basis * 0.32;
  const outerRadius = basis * 0.46;
  return {
    centerX: width / 2,
    centerY: height / 2,
    innerRadius,
    outerRadius,
  };
}

type RingChartCanvasProps = {
  width: number;
  height: number;
  arcData: ArcDatum[];
  visibleArcs: ArcDatum[];
  visibleTotalCents: number;
  currency: string;
  centerLabel: string;
  hoverIndex: number | null;
  setHoverIndex: (i: number | null) => void;
  onItemClick?: RingChartProps['onItemClick'];
  getTooltipLines?: RingChartProps['getTooltipLines'];
};

function RingChartCanvas({
  width,
  height,
  arcData,
  visibleArcs,
  visibleTotalCents,
  currency,
  centerLabel,
  hoverIndex,
  setHoverIndex,
  onItemClick,
  getTooltipLines,
}: RingChartCanvasProps) {
  const layout = useMemo(() => computeLayout(width, height), [width, height]);

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

  // When the tooltip closes (including via outside-tap dismiss) the hover
  // scale must reset too, otherwise the slice stays enlarged. We skip
  // `onPointerLeave` for touch, so this effect is the only place that resets
  // hover state on touch dismissal.
  useEffect(() => {
    if (!tooltipOpen) setHoverIndex(null);
  }, [tooltipOpen, setHoverIndex]);

  const setContainerRef = useMemo(
    () => mergeRefs<HTMLDivElement>(dismissContainerRef, tooltipContainerRef),
    [dismissContainerRef, tooltipContainerRef],
  );

  const showTooltipFor = useCallback(
    (datum: ArcDatum, clientX: number, clientY: number) => {
      const container = dismissContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percent =
        visibleTotalCents > 0 ? (datum.value / visibleTotalCents) * 100 : 0;
      const extra =
        getTooltipLines?.({ name: datum.name, value: datum.value }) ?? [];
      showTooltip({
        tooltipLeft: clientX - rect.left,
        tooltipTop: clientY - rect.top,
        tooltipData: {
          name: datum.name,
          value: datum.value,
          percent,
          extra,
        },
      });
    },
    [dismissContainerRef, getTooltipLines, showTooltip, visibleTotalCents],
  );

  const showTooltipForTouch = useCallback(
    (datum: ArcDatum, event: ReactTouchEvent<SVGPathElement>) => {
      const touchPoint = getTouchClientPoint(event);
      if (!touchPoint) return;
      showTooltipFor(datum, touchPoint.clientX, touchPoint.clientY);
    },
    [showTooltipFor],
  );

  const hovered =
    hoverIndex !== null ? (visibleArcs[hoverIndex] ?? null) : null;

  const centerName = hovered ? hovered.name : centerLabel;
  const centerValue = hovered
    ? toDisplayAmount(hovered.value, currency)
    : toDisplayAmount(visibleTotalCents, currency);

  return (
    <div ref={setContainerRef} className={styles.canvas}>
      <svg className={styles.svg} width={width} height={height}>
        <title>Ring chart</title>
        <Group top={layout.centerY} left={layout.centerX}>
          <Pie<ArcDatum>
            data={visibleArcs}
            pieValue={d => d.value}
            outerRadius={layout.outerRadius}
            innerRadius={layout.innerRadius}
            cornerRadius={CORNER_RADIUS}
            padAngle={PAD_ANGLE}
            pieSort={null}
            pieSortValues={null}
          >
            {({ arcs, path }) => (
              <AnimatedArcs
                arcs={arcs}
                path={path}
                hoverIndex={hoverIndex}
                onPointerActivate={(datum, i, event) => {
                  setHoverIndex(i);
                  showTooltipFor(datum, event.clientX, event.clientY);
                }}
                onPointerMove={(datum, _i, event) => {
                  showTooltipFor(datum, event.clientX, event.clientY);
                }}
                onTouchActivate={(datum, i, event) => {
                  setHoverIndex(i);
                  showTooltipForTouch(datum, event);
                }}
                onTouchMove={(datum, _i, event) => {
                  showTooltipForTouch(datum, event);
                }}
                onPointerLeave={event => {
                  if (event.pointerType === 'touch') return;
                  setHoverIndex(null);
                  hideTooltip();
                }}
                onClick={datum => {
                  if (!onItemClick) return;
                  onItemClick({ name: datum.name, value: datum.value });
                }}
              />
            )}
          </Pie>
        </Group>
      </svg>
      <div
        className={styles.centerOverlay}
        style={{
          top: layout.centerY,
          left: layout.centerX,
        }}
      >
        <div className={styles.centerName}>{centerName}</div>
        <div className={styles.centerValue}>
          {formatCurrency(centerValue, currency)}
        </div>
      </div>
      {tooltipOpen && tooltipData ? (
        <TooltipInPortal
          left={tooltipLeft}
          top={tooltipTop}
          style={EMPTY_TOOLTIP_STYLE}
          applyPositionStyle
          className={tooltipStyles.tooltip}
        >
          <div>
            <strong>{tooltipData.name}</strong>
          </div>
          <div>
            {formatCurrency(
              toDisplayAmount(tooltipData.value, currency),
              currency,
            )}{' '}
            ({tooltipData.percent.toFixed(1)}%)
          </div>
          {tooltipData.extra.map(line => (
            <div key={line} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </TooltipInPortal>
      ) : null}
    </div>
  );
}

type AnimatedArcsProps = {
  arcs: PieArcDatum<ArcDatum>[];
  path: (arc: PieArcDatum<ArcDatum>) => string | null;
  hoverIndex: number | null;
  onPointerActivate: (
    datum: ArcDatum,
    index: number,
    event: React.PointerEvent<SVGPathElement>,
  ) => void;
  onPointerMove: (
    datum: ArcDatum,
    index: number,
    event: React.PointerEvent<SVGPathElement>,
  ) => void;
  onTouchActivate: (
    datum: ArcDatum,
    index: number,
    event: ReactTouchEvent<SVGPathElement>,
  ) => void;
  onTouchMove: (
    datum: ArcDatum,
    index: number,
    event: ReactTouchEvent<SVGPathElement>,
  ) => void;
  onPointerLeave: (event: React.PointerEvent<SVGPathElement>) => void;
  onClick: (datum: ArcDatum) => void;
};

/**
 * Renders pie arcs with a small `requestAnimationFrame` tween of start/end
 * angles whenever the data changes. Avoids `@visx/react-spring` since the
 * project doesn't otherwise depend on react-spring; the interpolation is
 * trivial because we're tweening two numbers per arc keyed by name.
 */
function AnimatedArcs({
  arcs,
  path,
  hoverIndex,
  onPointerActivate,
  onPointerMove,
  onTouchActivate,
  onTouchMove,
  onPointerLeave,
  onClick,
}: AnimatedArcsProps) {
  const previousAnglesRef = useRef<Map<string, { start: number; end: number }>>(
    new Map(),
  );
  const [tweenedAngles, setTweenedAngles] = useState<
    Map<string, { start: number; end: number }>
  >(() => {
    const initial = new Map<string, { start: number; end: number }>();
    arcs.forEach(arc => {
      initial.set(arc.data.name, {
        start: arc.startAngle,
        end: arc.endAngle,
      });
    });
    return initial;
  });

  useEffect(() => {
    const fromMap = new Map(previousAnglesRef.current);
    const toMap = new Map<string, { start: number; end: number }>();
    arcs.forEach(arc => {
      toMap.set(arc.data.name, { start: arc.startAngle, end: arc.endAngle });
    });

    // Seed any newly-introduced arcs at zero-width so they grow in.
    arcs.forEach(arc => {
      if (!fromMap.has(arc.data.name)) {
        const midpoint = (arc.startAngle + arc.endAngle) / 2;
        fromMap.set(arc.data.name, { start: midpoint, end: midpoint });
      }
    });

    let frame = 0;
    let start = 0;
    let previousTimestamp = 0;
    let stalledFrames = 0;
    const tick = (timestamp: number) => {
      if (!start) start = timestamp || 1;
      // Guard: if the host never advances the clock (jsdom rAF mock, paused
      // tab) snap to the final state instead of recursing forever.
      if (timestamp === previousTimestamp) {
        stalledFrames += 1;
      } else {
        stalledFrames = 0;
        previousTimestamp = timestamp;
      }
      const forceEnd = stalledFrames >= 2;

      const elapsed = timestamp - start;
      const t = forceEnd ? 1 : Math.min(1, elapsed / ANIMATION_DURATION_MS);
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

      const next = new Map<string, { start: number; end: number }>();
      arcs.forEach(arc => {
        const from = fromMap.get(arc.data.name) ?? {
          start: arc.startAngle,
          end: arc.endAngle,
        };
        const to = toMap.get(arc.data.name) ?? {
          start: arc.startAngle,
          end: arc.endAngle,
        };
        next.set(arc.data.name, {
          start: from.start + (to.start - from.start) * eased,
          end: from.end + (to.end - from.end) * eased,
        });
      });
      setTweenedAngles(next);

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previousAnglesRef.current = toMap;
      }
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
    // We intentionally re-run only when the arc data identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcs]);

  return (
    <>
      {arcs.map((arc, i) => {
        const angles = tweenedAngles.get(arc.data.name) ?? {
          start: arc.startAngle,
          end: arc.endAngle,
        };
        const tweened: PieArcDatum<ArcDatum> = {
          ...arc,
          startAngle: angles.start,
          endAngle: angles.end,
        };
        const d = path(tweened) ?? '';
        const isHovered = hoverIndex === i;
        return (
          <path
            key={`arc-${arc.data.name}`}
            d={d}
            fill={paletteColor(arc.data.paletteIndex)}
            stroke={CHART_STROKE}
            strokeWidth={STROKE_WIDTH}
            className={styles.arc}
            style={{
              transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            }}
            onPointerEnter={event => onPointerActivate(arc.data, i, event)}
            onPointerDown={event => onPointerActivate(arc.data, i, event)}
            onPointerMove={event => onPointerMove(arc.data, i, event)}
            onTouchStart={event => onTouchActivate(arc.data, i, event)}
            onTouchMove={event => onTouchMove(arc.data, i, event)}
            onPointerLeave={onPointerLeave}
            onClick={() => onClick(arc.data)}
          />
        );
      })}
    </>
  );
}

export function RingChart({
  items,
  currency,
  centerLabel = 'Total',
  onItemClick,
  getTooltipLines,
}: RingChartProps) {
  const arcData = useMemo<ArcDatum[]>(
    () =>
      items.map((item, index) => ({
        name: item.name,
        value: item.value,
        paletteIndex: index,
      })),
    [items],
  );

  // Track explicitly-hidden names. Items default to visible; renames or new
  // items appear visible automatically without sync logic.
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(() => new Set());

  const visibleArcs = useMemo(() => {
    const filtered = arcData.filter(item => !hiddenNames.has(item.name));
    if (filtered.length === 0 && arcData.length > 0) {
      // Refuse "all hidden" — fall back to all items visible.
      return arcData;
    }
    return filtered;
  }, [arcData, hiddenNames]);

  const visibleNames = useMemo(
    () => new Set(visibleArcs.map(item => item.name)),
    [visibleArcs],
  );

  const visibleTotalCents = useMemo(
    () => visibleArcs.reduce((sum, item) => sum + (item.value ?? 0), 0),
    [visibleArcs],
  );

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const toggleVisible = useCallback(
    (name: string) => {
      setHiddenNames(prev => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
          return next;
        }
        const visibleCount = arcData.filter(
          item => !next.has(item.name),
        ).length;
        if (visibleCount <= 1) return prev;
        next.add(name);
        return next;
      });
      setHoverIndex(null);
    },
    [arcData],
  );

  return (
    <div className={styles.root}>
      <div className={styles.chartArea}>
        <ChartShell minWidth={1} minHeight={1}>
          {({ width, height }) => (
            <RingChartCanvas
              width={width}
              height={height}
              arcData={arcData}
              visibleArcs={visibleArcs}
              visibleTotalCents={visibleTotalCents}
              currency={currency}
              centerLabel={centerLabel}
              hoverIndex={hoverIndex}
              setHoverIndex={setHoverIndex}
              onItemClick={onItemClick}
              getTooltipLines={getTooltipLines}
            />
          )}
        </ChartShell>
      </div>
      <RingChartLegend
        items={arcData}
        visibleNames={visibleNames}
        toggleVisible={toggleVisible}
      />
    </div>
  );
}

type RingChartLegendProps = {
  items: ArcDatum[];
  visibleNames: Set<string>;
  toggleVisible: (name: string) => void;
};

function RingChartLegend({
  items,
  visibleNames,
  toggleVisible,
}: RingChartLegendProps) {
  return (
    <ul className={legendStyles.legend} data-testid="ring-chart-legend">
      {items.map(item => {
        const hidden = !visibleNames.has(item.name);
        return (
          <li key={item.name}>
            <button
              type="button"
              onClick={() => toggleVisible(item.name)}
              className={`${legendStyles.legendItem} ${
                hidden ? legendStyles.legendItemHidden : ''
              }`}
              aria-pressed={!hidden}
            >
              <span
                className={legendStyles.legendDot}
                style={{
                  background: hidden
                    ? 'transparent'
                    : paletteColor(item.paletteIndex),
                }}
              />
              <span className={legendStyles.legendLabel}>{item.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
