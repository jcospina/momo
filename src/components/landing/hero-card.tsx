'use client';

import { Hero } from './hero';
import styles from './landing-page.module.css';
import { useHeroRef } from './landing-scroll-context';

export function HeroCard() {
  const heroRef = useHeroRef();

  return (
    <div ref={heroRef} className={styles['momo-landing__hero']}>
      <Hero />
    </div>
  );
}
