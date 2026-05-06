'use client';

import { ThemeSelector } from '@components/theme-selector/theme-selector';
import { useNavigationProgress } from '@providers/navigation-progress-provider';
import { Logo } from '@ui/logo/logo';
import { Navbar } from '@ui/navbar/navbar';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import styles from './app-navbar.module.css';

const HOME = '/home';
const STATS = '/home/stats';
const PROFILE = '/home/profile';

export function AppNavbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { navigate } = useNavigationProgress();

  const isHome = pathname === HOME;
  const isStats = pathname === STATS;
  const isProfile = pathname === PROFILE;

  const handleClick = (href: string) => (event: MouseEvent) => {
    event.preventDefault();
    navigate(href);
  };

  const logo = isHome ? (
    <Logo size="md" />
  ) : (
    <a
      href={HOME}
      onClick={handleClick(HOME)}
      className={styles['momo-app-navbar__logo-link']}
    >
      <Logo size="md" />
    </a>
  );

  const links = (
    <>
      {!isHome && (
        <a
          href={HOME}
          onClick={handleClick(HOME)}
          className={styles['momo-app-navbar__link']}
        >
          {t('home')}
        </a>
      )}
      {!isStats && (
        <a
          href={STATS}
          onClick={handleClick(STATS)}
          className={styles['momo-app-navbar__link']}
        >
          {t('stats')}
        </a>
      )}
      {!isProfile && (
        <a
          href={PROFILE}
          onClick={handleClick(PROFILE)}
          className={styles['momo-app-navbar__link']}
        >
          {t('profile')}
        </a>
      )}
    </>
  );

  return (
    <Navbar
      className={styles['momo-app-navbar']}
      logo={logo}
      themeSelector={<ThemeSelector />}
      links={links}
    />
  );
}
