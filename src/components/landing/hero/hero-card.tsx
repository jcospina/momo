'use client';

import styles from '@components/landing/landing-page.module.css';
import { useHeroRef } from '@components/landing/scroll/landing-scroll-context';
import { Hero } from './hero';

export function HeroCard() {
  const heroRef = useHeroRef();

  return (
    <div ref={heroRef} className={styles['momo-landing__hero']}>
      <Hero />
    </div>
  );
}
