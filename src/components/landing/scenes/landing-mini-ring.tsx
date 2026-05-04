'use client';

import {
  CHART_PALETTE,
  CHART_STROKE,
} from '@components/charts/shared/chart-colors';
import { ChartShell } from '@components/charts/shared/chart-shell';
import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import gsap from 'gsap';
import { useRef } from 'react';
import styles from './landing-mini-ring.module.css';

type RingDatum = {
  name: string;
  value: number;
};

type LandingMiniRingProps = {
  data: RingDatum[];
  ariaLabel: string;
};

const PAD_ANGLE = 0.04;
const CORNER_RADIUS = 6;

export function LandingMiniRing({ data, ariaLabel }: LandingMiniRingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slicesRef = useRef<SVGGElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inView = useInView(rootRef, { threshold: 0.5, once: true });

  useGSAP(
    () => {
      const group = slicesRef.current;
      if (!group) return;
      const slices = group.querySelectorAll<SVGPathElement>('[data-slice]');
      if (slices.length === 0) return;

      if (reducedMotion) {
        gsap.set(slices, { scale: 1, opacity: 1 });
        return;
      }

      if (!inView) {
        gsap.set(slices, {
          scale: 0,
          opacity: 0,
          transformOrigin: 'center center',
        });
        return;
      }

      gsap.fromTo(
        slices,
        { scale: 0, opacity: 0, transformOrigin: 'center center' },
        {
          scale: 1,
          opacity: 1,
          duration: 0.55,
          ease: 'back.out(1.6)',
          stagger: 0.08,
        },
      );
    },
    { scope: rootRef, dependencies: [inView, reducedMotion] },
  );

  return (
    <div
      ref={rootRef}
      className={styles['momo-mini-ring']}
      aria-label={ariaLabel}
      role="img"
    >
      <ChartShell minWidth={1} minHeight={1}>
        {({ width, height }) => {
          const basis = Math.min(width, height);
          const innerRadius = basis * 0.32;
          const outerRadius = basis * 0.46;
          return (
            <svg width={width} height={height}>
              <title>{ariaLabel}</title>
              <Group top={height / 2} left={width / 2} innerRef={slicesRef}>
                <Pie<RingDatum>
                  data={data}
                  pieValue={d => d.value}
                  outerRadius={outerRadius}
                  innerRadius={innerRadius}
                  cornerRadius={CORNER_RADIUS}
                  padAngle={PAD_ANGLE}
                  pieSort={null}
                  pieSortValues={null}
                >
                  {({ arcs, path }) =>
                    arcs.map((arc, i) => {
                      const d = path(arc) ?? '';
                      return (
                        <path
                          key={`slice-${arc.data.name}`}
                          data-slice
                          d={d}
                          fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                          stroke={CHART_STROKE}
                          strokeWidth={2}
                        />
                      );
                    })
                  }
                </Pie>
              </Group>
            </svg>
          );
        }}
      </ChartShell>
    </div>
  );
}
