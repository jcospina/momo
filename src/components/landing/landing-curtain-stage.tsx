'use client';

import DotGrid from '@ui/dot-grid/dot-grid';
import type { ReactNode } from 'react';
import { HeroCard } from './hero-card';
import styles from './landing-page.module.css';
import { useLandingCurtainRefs } from './landing-scroll-context';

export function LandingCurtainStage({ children }: { children: ReactNode }) {
  const { curtainContentRef, curtainStageRef } = useLandingCurtainRefs();

  return (
    <section
      ref={curtainStageRef}
      className={styles['momo-landing__curtain-stage']}
    >
      <div className={styles['momo-landing__hero-sticky']}>
        <div className={styles['momo-landing__hero-surface']}>
          <HeroCard />
        </div>
      </div>
      <div
        ref={curtainContentRef}
        className={styles['momo-landing__content-layer']}
      >
        <DotGrid
          position="absolute"
          blastStrength={4}
          blastRadius={100}
          className={styles['momo-landing__content-dots']}
        />
        <div className={styles['momo-landing__content-inner']}>{children}</div>
      </div>
    </section>
  );
}
