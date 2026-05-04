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

export function LandingNavbar() {
  const t = useTranslations('landing.nav');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { curtainContentRef, curtainStageRef } = useLandingCurtainRefs();
  const navRef = useRef<HTMLElement | null>(null);

  useScrollTick(() => {
    const nav = navRef.current;
    const content = curtainContentRef.current;
    const stage = curtainStageRef.current;
    if (nav === null || content === null || stage === null || reducedMotion) {
      if (nav !== null) {
        gsap.set(nav, { yPercent: 0 });
      }
      return;
    }

    const viewportHeight = window.innerHeight || 1;
    const scrollY = window.scrollY;
    const contentTop = content.getBoundingClientRect().top + window.scrollY;
    const stageHeight = stage.offsetHeight;
    const navHeight = nav.offsetHeight;
    const curtainStart = Math.max(0, contentTop - viewportHeight);
    const curtainEnd = contentTop;
    const curtainRange = curtainEnd - curtainStart;
    if (stageHeight <= 0 || curtainRange <= 0) {
      gsap.set(nav, { yPercent: 0 });
      return;
    }

    const edge = Math.min(0.18, Math.max(0.06, navHeight / curtainRange));
    const progress = clampProgress((scrollY - curtainStart) / curtainRange);

    let translatePercent: number;
    if (progress <= edge) {
      translatePercent = -(progress / edge) * 100;
    } else if (progress >= 1 - edge) {
      const t = (progress - (1 - edge)) / edge;
      translatePercent = -100 + t * 100;
    } else {
      translatePercent = -100;
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
