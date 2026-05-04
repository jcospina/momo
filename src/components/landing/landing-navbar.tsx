'use client';

import { ThemeSelector } from '@components/theme-selector/theme-selector';
import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollProgress, useScrollTick } from '@hooks/use-scroll-progress';
import { Logo } from '@ui/logo/logo';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import styles from './landing-navbar.module.css';
import { useHeroSpacerRef } from './landing-scroll-context';

export function LandingNavbar() {
  const t = useTranslations('landing.nav');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const spacerRef = useHeroSpacerRef();
  const navRef = useRef<HTMLElement | null>(null);
  const getProgress = useScrollProgress(spacerRef, {
    start: 'top-top',
    end: 'bottom-top',
  });

  useScrollTick(() => {
    if (reducedMotion) return;
    const nav = navRef.current;
    if (nav === null) return;
    const navHeight = nav.offsetHeight;
    const vh = window.innerHeight || 1;
    const edge = navHeight / vh;
    const p = getProgress();

    let translatePercent: number;
    if (p <= edge) {
      translatePercent = -(p / edge) * 100;
    } else if (p >= 1 - edge) {
      const t = (p - (1 - edge)) / edge;
      translatePercent = -100 + t * 100;
    } else {
      translatePercent = -100;
    }
    gsap.set(nav, { yPercent: translatePercent });
  });

  return (
    <nav
      ref={navRef}
      className={cn(
        styles['momo-landing-nav'],
        !reducedMotion && styles['momo-landing-nav--floating'],
      )}
    >
      <div className={styles['momo-landing-nav__inner']}>
        <div className={styles['momo-landing-nav__logo']}>
          <Logo size="sm" />
        </div>
        <div className={styles['momo-landing-nav__links']}>
          <ThemeSelector />
          <a
            href="#features"
            className={`${styles['momo-landing-nav__link']} ${styles['momo-landing-nav__section-link']}`}
          >
            <span className={styles['momo-landing-nav__link-text']}>
              {t('features')}
            </span>
          </a>
          <a
            href="#how"
            className={`${styles['momo-landing-nav__link']} ${styles['momo-landing-nav__section-link']}`}
          >
            <span className={styles['momo-landing-nav__link-text']}>
              {t('how')}
            </span>
          </a>
          <Link href="/login" className={styles['momo-landing-nav__link']}>
            {t('login')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
