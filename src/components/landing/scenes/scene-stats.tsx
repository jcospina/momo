'use client';

import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { Highlight } from '@ui/highlight/highlight';
import { Typography } from '@ui/typography/typography';
import gsap from 'gsap';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';
import { SceneShell } from './scene-shell';
import styles from './scene-stats.module.css';

// Below-the-fold chart: defer the visx/d3 bundle (~23KB gz) out of the
// landing's initial JS. The container reserves a fixed height in CSS, so the
// lazy mount does not shift layout.
const LandingMiniBar = dynamic(
  () => import('./charts/landing-mini-bar').then(m => m.LandingMiniBar),
  { ssr: false },
);

const CATEGORY_KEYS = ['food', 'groceries', 'transit', 'fun'] as const;

const MONTH_BREAKDOWN: Array<Record<(typeof CATEGORY_KEYS)[number], number>> = [
  { food: 280, groceries: 230, transit: 110, fun: 100 }, // Nov  → 720
  { food: 320, groceries: 260, transit: 130, fun: 135 }, // Dec  → 845
  { food: 250, groceries: 220, transit: 100, fun: 120 }, // Jan  → 690
  { food: 420, groceries: 380, transit: 200, fun: 180 }, // Feb  → 1180 (highest)
  { food: 200, groceries: 180, transit: 80, fun: 80 }, //  Mar  → 540
  { food: 230, groceries: 200, transit: 95, fun: 87 }, //  Apr  → 612
];

export function SceneStats() {
  const t = useTranslations('landing.stats');
  const stickerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inView = useInView(wrapperRef, { threshold: 0.4, once: true });

  useGSAP(
    () => {
      const stickerEl = stickerRef.current;
      if (!stickerEl) return;

      if (reducedMotion) {
        gsap.set(stickerEl, { scale: 1, rotation: 6, opacity: 1 });
        return;
      }

      if (!inView) {
        gsap.set(stickerEl, { scale: 0, rotation: 0, opacity: 0 });
        return;
      }

      gsap.fromTo(
        stickerEl,
        { scale: 0, rotation: 0, opacity: 0 },
        {
          scale: 1,
          rotation: 6,
          opacity: 1,
          duration: 0.5,
          ease: 'back.out(2)',
          delay: 0.85,
          transformOrigin: 'center center',
        },
      );
    },
    { scope: wrapperRef, dependencies: [inView, reducedMotion] },
  );

  const months = (t.raw('months') as string[] | undefined) ?? [];

  const data = useMemo(
    () =>
      months.slice(0, MONTH_BREAKDOWN.length).map((label, i) => ({
        month: label,
        ...MONTH_BREAKDOWN[i],
      })),
    [months],
  );

  // Highest month gets the sticker. We compute the centre x as a percentage
  // of the chart inner width so the sticker pins above the right bar at any
  // breakpoint.
  const totals = MONTH_BREAKDOWN.map(b =>
    CATEGORY_KEYS.reduce((sum, k) => sum + b[k], 0),
  );
  const highestIndex = totals.indexOf(Math.max(...totals));
  const stickerLeftPercent = ((highestIndex + 0.5) / months.length) * 100;

  return (
    <SceneShell
      tilt={1}
      layout="title-left"
      statementDesktopBasis="40%"
      artifactDesktopBasis="60%"
      statement={
        <Typography
          as="h2"
          size="display"
          weight="bold"
          className={styles['momo-scene-stats__statement']}
        >
          {t.rich('statement', {
            warm: chunks => (
              <Highlight variant="warm" rotation="left">
                {chunks}
              </Highlight>
            ),
          })}
        </Typography>
      }
      artifact={
        <div ref={wrapperRef} className={styles['momo-scene-stats']}>
          <div className={styles['momo-scene-stats__chart']}>
            <LandingMiniBar
              data={data}
              keys={CATEGORY_KEYS as unknown as string[]}
              ariaLabel={t('ariaLabel')}
            />
            <div
              className={styles['momo-scene-stats__sticker-anchor']}
              style={{ left: `${stickerLeftPercent}%` }}
              aria-hidden
            >
              <div
                ref={stickerRef}
                className={styles['momo-scene-stats__sticker']}
              >
                <Typography as="span" size="sm" weight="bold">
                  {t('sticker')}
                </Typography>
              </div>
            </div>
          </div>
          <Typography size="sm" className={styles['momo-scene-stats__caption']}>
            {t('caption')}
          </Typography>
        </div>
      }
    />
  );
}
