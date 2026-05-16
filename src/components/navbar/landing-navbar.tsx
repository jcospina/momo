'use client';

import { useOptionalLandingCurtainRefs } from '@components/landing/scroll/landing-scroll-context';
import { ThemeSelector } from '@components/theme-selector/theme-selector';
import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollTick } from '@hooks/use-scroll-progress';
import { Logo } from '@ui/logo/logo';
import { Navbar } from '@ui/navbar/navbar';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { LOGIN_PATH, SIGNUP_PATH } from '@/lib/routes';
import styles from './landing-navbar.module.css';

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
  const pathname = usePathname();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const curtainRefs = useOptionalLandingCurtainRefs();
  const navRef = useRef<HTMLElement | null>(null);
  const isLandingRoot = pathname === '/';

  useScrollTick(() => {
    const nav = navRef.current;
    const stage = curtainRefs?.curtainStageRef.current ?? null;
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

  const logo = isLandingRoot ? (
    <Logo size="sm" />
  ) : (
    <Link href="/" className={styles['momo-landing-navbar__logo-link']}>
      <Logo size="sm" />
    </Link>
  );

  const links = (
    <>
      <Link
        href={SIGNUP_PATH}
        className={cn(
          styles['momo-landing-navbar__link'],
          styles['momo-landing-navbar__link--signup'],
          styles['momo-landing-navbar__link--desktop-only'],
        )}
      >
        {t('signup')}
      </Link>
      <Link href={LOGIN_PATH} className={styles['momo-landing-navbar__link']}>
        {t('login')}
      </Link>
    </>
  );

  return (
    <Navbar
      navRef={navRef}
      className={styles['momo-landing-navbar']}
      logo={logo}
      themeSelector={<ThemeSelector />}
      links={links}
    />
  );
}
