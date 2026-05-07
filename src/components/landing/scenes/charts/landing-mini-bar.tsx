'use client';

import { paletteColor } from '@components/charts/shared/chart-colors';
import { ChartShell } from '@components/charts/shared/chart-shell';
import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import gsap from 'gsap';
import { useMemo, useRef } from 'react';
import styles from './landing-mini-bar.module.css';

type MonthRow = { month: string } & Record<string, number | string>;

type LandingMiniBarProps = {
  /** Each row: a month plus one number per category key. */
  data: MonthRow[];
  /** Ordered category keys (used to look up values per row + colour). */
  keys: string[];
  ariaLabel: string;
};

const PADDING_X = 8;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const BAR_MAX_WIDTH = 40;
const BAR_RADIUS = 4;

export function LandingMiniBar({ data, keys, ariaLabel }: LandingMiniBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stacksRef = useRef<SVGGElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inView = useInView(rootRef, { threshold: 0.5, once: true });

  const totals = useMemo(
    () =>
      data.map(row =>
        keys.reduce((sum, key) => sum + ((row[key] as number) ?? 0), 0),
      ),
    [data, keys],
  );

  useGSAP(
    () => {
      const group = stacksRef.current;
      if (!group) return;
      const bars = group.querySelectorAll<SVGGElement>('[data-stack]');
      if (bars.length === 0) return;

      if (reducedMotion) {
        gsap.set(bars, { scaleY: 1, opacity: 1 });
        return;
      }

      if (!inView) {
        gsap.set(bars, {
          scaleY: 0,
          opacity: 0,
          transformOrigin: 'center bottom',
        });
        return;
      }

      gsap.fromTo(
        bars,
        {
          scaleY: 0,
          opacity: 0,
          transformOrigin: 'center bottom',
        },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.07,
        },
      );
    },
    { scope: rootRef, dependencies: [inView, reducedMotion] },
  );

  return (
    <div
      ref={rootRef}
      className={styles['momo-mini-bar']}
      role="img"
      aria-label={ariaLabel}
    >
      <ChartShell minWidth={1} minHeight={1}>
        {({ width, height }) => {
          const innerWidth = Math.max(0, width - PADDING_X * 2);
          const innerHeight = Math.max(
            0,
            height - PADDING_TOP - PADDING_BOTTOM,
          );

          const months = data.map(d => d.month as string);
          const xScale = scaleBand<string>({
            domain: months,
            range: [0, innerWidth],
            padding: 0.32,
          });

          const max = Math.max(...totals, 1);
          const yScale = scaleLinear<number>({
            domain: [0, max * 1.05],
            range: [innerHeight, 0],
          });

          const bandwidth = xScale.bandwidth();
          const barWidth = Math.min(bandwidth, BAR_MAX_WIDTH);
          const barOffset = (bandwidth - barWidth) / 2;
          const baseY = yScale(0);

          return (
            <svg width={width} height={height}>
              <title>{ariaLabel}</title>
              <Group top={PADDING_TOP} left={PADDING_X} innerRef={stacksRef}>
                {months.map((month, monthIndex) => {
                  const total = totals[monthIndex] ?? 0;
                  if (total <= 0) return null;

                  const xBase = (xScale(month) ?? 0) + barOffset;
                  const topY = yScale(total);
                  const barHeight = baseY - topY;

                  return (
                    <g
                      key={`stack-${month}`}
                      data-stack
                      data-month={month}
                      transform={`translate(${xBase} 0)`}
                    >
                      <rect
                        x={0}
                        y={topY}
                        width={barWidth}
                        height={barHeight}
                        rx={BAR_RADIUS}
                        fill={paletteColor(monthIndex)}
                      />
                    </g>
                  );
                })}
                {/* Month labels under each bar */}
                {months.map(month => {
                  const x = (xScale(month) ?? 0) + bandwidth / 2;
                  return (
                    <text
                      key={`label-${month}`}
                      x={x}
                      y={baseY + 18}
                      textAnchor="middle"
                      className={styles['momo-mini-bar__label']}
                    >
                      {month}
                    </text>
                  );
                })}
                {/* Baseline rule */}
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={baseY}
                  y2={baseY}
                  stroke="var(--color-dark)"
                  strokeWidth={2}
                />
              </Group>
            </svg>
          );
        }}
      </ChartShell>
    </div>
  );
}
