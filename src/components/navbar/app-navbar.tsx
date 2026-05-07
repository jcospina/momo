'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ThemeSelector } from '@components/theme-selector/theme-selector';
import { useMediaQuery } from '@hooks/use-media-query';
import { useNavigationProgress } from '@providers/navigation-progress-provider';
import { Highlight } from '@ui/highlight/highlight';
import { ChartIcon } from '@ui/icons/chart';
import { MessageIcon } from '@ui/icons/message';
import { PersonIcon } from '@ui/icons/person';
import { Logo } from '@ui/logo/logo';
import { Navbar } from '@ui/navbar/navbar';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType, CSSProperties, MouseEvent, SVGProps } from 'react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import styles from './app-navbar.module.css';
import { MobileNavToggleIcon } from './mobile-nav-toggle-icon';

const HOME = '/home';
const STATS = '/home/stats';
const PROFILE = '/home/profile';

type NavLabelKey = 'home' | 'stats' | 'profile';

type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: HOME,
    labelKey: 'home',
    Icon: MessageIcon,
    isActive: pathname => pathname === HOME,
  },
  {
    href: STATS,
    labelKey: 'stats',
    Icon: ChartIcon,
    isActive: pathname => pathname === STATS,
  },
  {
    href: PROFILE,
    labelKey: 'profile',
    Icon: PersonIcon,
    isActive: pathname => pathname === PROFILE,
  },
];

export function AppNavbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width: 720px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { navigate } = useNavigationProgress();
  const navRef = useRef<HTMLElement | null>(null);
  const previousPathnameRef = useRef(pathname);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTop, setDrawerTop] = useState(0);
  const popupId = useId();
  const triggerId = `${popupId}-trigger`;

  const isHome = pathname === HOME;

  const measureDrawerTop = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    setDrawerTop(Math.max(nav.getBoundingClientRect().bottom, 0));
  }, []);

  useLayoutEffect(() => {
    if (!isMobile || !isDrawerOpen) return;

    const updateDrawerTop = () => {
      measureDrawerTop();
    };

    updateDrawerTop();
    window.addEventListener('resize', updateDrawerTop);

    return () => {
      window.removeEventListener('resize', updateDrawerTop);
    };
  }, [isDrawerOpen, isMobile, measureDrawerTop]);

  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !isDrawerOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isDrawerOpen, isMobile]);

  useEffect(() => {
    if (pathname !== previousPathnameRef.current) {
      previousPathnameRef.current = pathname;
      setIsDrawerOpen(false);
    }
  }, [pathname]);

  const handleNavItemClick =
    (href: string, active: boolean) => (event: MouseEvent) => {
      event.preventDefault();

      if (active) return;

      if (isMobile) {
        setIsDrawerOpen(false);
      }
      navigate(href);
    };

  const logo = isHome ? (
    <Logo size="md" />
  ) : (
    <a
      href={HOME}
      onClick={handleNavItemClick(HOME, false)}
      className={styles['momo-app-navbar__logo-link']}
    >
      <Logo size="md" />
    </a>
  );

  const desktopLinks = (
    <>
      {NAV_ITEMS.map(item => {
        const label = t(item.labelKey);
        const active = item.isActive(pathname);

        if (active) {
          return (
            <Highlight
              key={item.href}
              as="a"
              href={item.href}
              onClick={handleNavItemClick(item.href, active)}
              aria-current="page"
              variant="feature"
              rotation="none"
              className={styles['momo-app-navbar__link-active']}
            >
              {label}
            </Highlight>
          );
        }

        return (
          <a
            key={item.href}
            href={item.href}
            onClick={handleNavItemClick(item.href, active)}
            className={styles['momo-app-navbar__link']}
          >
            {label}
          </a>
        );
      })}
    </>
  );

  const drawerOffsetStyle = {
    '--momo-app-navbar-drawer-top': `${drawerTop}px`,
  } as CSSProperties;

  const mobileMenuButton = (
    <BaseDialog.Trigger
      id={triggerId}
      className={styles['momo-app-navbar__drawer-toggle']}
      aria-label={isDrawerOpen ? t('closeMenu') : t('openMenu')}
      render={props => (
        <button {...props} type="button">
          <MobileNavToggleIcon
            open={isDrawerOpen}
            reducedMotion={reducedMotion}
          />
        </button>
      )}
    />
  );

  if (!isMobile) {
    return (
      <Navbar
        navRef={navRef}
        className={styles['momo-app-navbar']}
        logo={logo}
        themeSelector={<ThemeSelector />}
        links={desktopLinks}
      />
    );
  }

  return (
    <BaseDialog.Root
      open={isDrawerOpen}
      onOpenChange={setIsDrawerOpen}
      triggerId={triggerId}
      modal={false}
    >
      <Navbar
        navRef={navRef}
        className={styles['momo-app-navbar']}
        logo={logo}
        themeSelector={<ThemeSelector />}
        links={mobileMenuButton}
      />
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          data-testid="app-navbar-drawer-backdrop"
          className={styles['momo-app-navbar__drawer-backdrop']}
          style={drawerOffsetStyle}
          data-reduced-motion={reducedMotion ? '' : undefined}
        />
        <BaseDialog.Viewport
          className={styles['momo-app-navbar__drawer-viewport']}
          style={drawerOffsetStyle}
        >
          <BaseDialog.Popup
            id={popupId}
            aria-label={t('navigation')}
            className={styles['momo-app-navbar__drawer']}
            data-reduced-motion={reducedMotion ? '' : undefined}
          >
            <BaseDialog.Title
              className={styles['momo-app-navbar__drawer-title']}
            >
              {t('navigation')}
            </BaseDialog.Title>
            <ul className={styles['momo-app-navbar__drawer-list']}>
              {NAV_ITEMS.map(item => {
                const label = t(item.labelKey);
                const active = item.isActive(pathname);
                const icon = (
                  <item.Icon
                    width={20}
                    height={20}
                    aria-hidden="true"
                    className={styles['momo-app-navbar__drawer-icon']}
                  />
                );

                return (
                  <li
                    key={item.href}
                    className={styles['momo-app-navbar__drawer-item']}
                  >
                    {active ? (
                      <Highlight
                        as="span"
                        variant="feature"
                        rotation="none"
                        className={
                          styles['momo-app-navbar__drawer-link-active']
                        }
                        aria-current="page"
                      >
                        {icon}
                        <span>{label}</span>
                      </Highlight>
                    ) : (
                      <a
                        href={item.href}
                        onClick={handleNavItemClick(item.href, active)}
                        className={styles['momo-app-navbar__drawer-link']}
                      >
                        {icon}
                        <span>{label}</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
