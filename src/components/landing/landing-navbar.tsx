'use client';

import { ThemeSelector } from '@components/theme-selector/theme-selector';
import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollTick } from '@hooks/use-scroll-progress';
import { Logo } from '@ui/logo/logo';
import gsap from 'gsap';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import styles from './landing-navbar.module.css';
import { useLandingCurtainRefs } from './landing-scroll-context';

function clampProgress(progress: number): number {
  if (progress < 0) return 0;
  if (progress > 1) return 1;
  return progress;
}

function getHandoffDistance(viewportHeight: number): number {
  return Math.min(Math.max(viewportHeight * 0.22, 144), 256);
}

export function LandingNavbar() {
  const t = useTranslations('landing.nav');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { curtainStageRef } = useLandingCurtainRefs();
  const navRef = useRef<HTMLElement | null>(null);

  useScrollTick(() => {
    const nav = navRef.current;
    const stage = curtainStageRef.current;
    if (nav === null || stage === null || reducedMotion) {
      if (nav !== null) {
        gsap.set(nav, { yPercent: 0 });
      }
      return;
    }

    const viewportHeight = window.innerHeight || 1;
    const scrollY = window.scrollY;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    const navHeight = nav.offsetHeight;
    const handoffDistance = getHandoffDistance(viewportHeight);
    if (handoffDistance <= 0) {
      gsap.set(nav, { yPercent: 0 });
      return;
    }

    const hideStart = stageTop;
    const hideEnd = hideStart + Math.max(navHeight * 1.15, 72);
    const heroMostlyGone = stageTop + handoffDistance + viewportHeight * 0.72;
    const returnDistance = Math.max(navHeight * 2, viewportHeight * 0.14);
    const returnEnd = heroMostlyGone + returnDistance;

    let translatePercent: number;
    if (scrollY <= hideStart) {
      translatePercent = 0;
    } else if (scrollY < hideEnd) {
      const t = clampProgress((scrollY - hideStart) / (hideEnd - hideStart));
      translatePercent = -t * 100;
    } else if (scrollY < heroMostlyGone) {
      translatePercent = -100;
    } else if (scrollY < returnEnd) {
      const t = clampProgress(
        (scrollY - heroMostlyGone) / (returnEnd - heroMostlyGone),
      );
      translatePercent = -100 + t * 100;
    } else {
      translatePercent = 0;
    }
    gsap.set(nav, { yPercent: translatePercent });
  });

  return (
    <nav ref={navRef} className={styles['momo-landing-nav']}>
      <div className={styles['momo-landing-nav__inner']}>
        <div className={styles['momo-landing-nav__logo']}>
          <Logo size="sm" />
        </div>
        <div className={styles['momo-landing-nav__links']}>
          <ThemeSelector />
          <Link href="/login" className={styles['momo-landing-nav__link']}>
            {t('login')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
