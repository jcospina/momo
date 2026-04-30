'use client';

import { ThemeSelector } from '@components/theme-selector/theme-selector';
import { Logo } from '@ui/logo/logo';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './landing.module.css';

export function LandingNavbar() {
  const t = useTranslations('landing.nav');

  return (
    <nav className={styles['momo-landing-nav']}>
      <div className={styles['momo-landing-nav__inner']}>
        <div className={styles['momo-landing-nav__logo']}>
          <Logo />
        </div>
        <div className={styles['momo-landing-nav__links']}>
          <a href="#features" className={styles['momo-landing-nav__link']}>
            <span className={styles['momo-landing-nav__link-text']}>
              {t('features')}
            </span>
          </a>
          <a href="#how" className={styles['momo-landing-nav__link']}>
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
