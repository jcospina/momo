'use client';

import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollProgress, useScrollTick } from '@hooks/use-scroll-progress';
import gsap from 'gsap';
import { useRef } from 'react';
import { Hero } from './hero';
import styles from './landing-page.module.css';
import { useHeroSpacerRef } from './landing-scroll-context';

export function HeroCard() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const spacerRef = useHeroSpacerRef();
  const slotRef = useRef<HTMLDivElement | null>(null);
  const getProgress = useScrollProgress(spacerRef, {
    start: 'top-top',
    end: 'bottom-top',
  });

  useScrollTick(() => {
    if (reducedMotion) return;
    const slot = slotRef.current;
    if (!slot) return;
    const p = getProgress();
    const eased = p * p;
    gsap.set(slot, { yPercent: -eased * 100 });
  });

  if (reducedMotion) {
    return <Hero />;
  }

  return (
    <>
      <div ref={slotRef} className={styles['momo-landing__hero-slot']}>
        <Hero />
      </div>
      <div ref={spacerRef} className={styles['momo-landing__hero-spacer']} />
    </>
  );
}
