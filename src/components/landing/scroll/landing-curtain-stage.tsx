'use client';

import { HeroCard } from '@components/landing/hero/hero-card';
import styles from '@components/landing/landing-page.module.css';
import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollTick } from '@hooks/use-scroll-progress';
import type { ReactNode } from 'react';
import { useLandingCurtainRefs } from './landing-scroll-context';
import { LandingScrollIndicator } from './landing-scroll-indicator';

function getHandoffDistance(viewportHeight: number): number {
  return Math.min(Math.max(viewportHeight * 0.22, 144), 256);
}

function clampProgress(progress: number): number {
  if (progress < 0) return 0;
  if (progress > 1) return 1;
  return progress;
}

export function LandingCurtainStage({ children }: { children: ReactNode }) {
  const { curtainContentRef, curtainStageRef } = useLandingCurtainRefs();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useScrollTick(() => {
    const stage = curtainStageRef.current;
    const content = curtainContentRef.current;
    if (stage === null) return;
    if (content === null || reducedMotion) {
      stage.style.setProperty('--curtain-progress', '0');
      return;
    }
    const viewportHeight = window.innerHeight || 1;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    const handoffDistance = getHandoffDistance(viewportHeight);
    if (handoffDistance <= 0) {
      stage.style.setProperty('--curtain-progress', '0');
      return;
    }
    const progress = clampProgress(
      (window.scrollY - stageTop) / handoffDistance,
    );
    stage.style.setProperty('--curtain-progress', progress.toFixed(4));
  });

  return (
    <section
      ref={curtainStageRef}
      className={styles['momo-landing__curtain-stage']}
    >
      <div className={styles['momo-landing__hero-handoff']}>
        <div className={styles['momo-landing__hero-sticky']}>
          <div className={styles['momo-landing__hero-surface']}>
            <HeroCard />
            <LandingScrollIndicator />
          </div>
        </div>
      </div>
      <div
        ref={curtainContentRef}
        className={styles['momo-landing__content-layer']}
      >
        <div className={styles['momo-landing__content-inner']}>{children}</div>
      </div>
    </section>
  );
}
