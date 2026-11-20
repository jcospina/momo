'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { useMediaQuery } from '@hooks/use-media-query';
import type { Profile } from '@lib-types/profile';
import { useNavigationProgress } from '@providers/navigation-progress-provider';
import { useProfile } from '@providers/profile-provider';
import { Avatar } from '@ui/avatar/avatar';
import { ChartIcon } from '@ui/icons/chart';
import { CloseIcon } from '@ui/icons/close';
import { MenuIcon } from '@ui/icons/menu';
import { MessageIcon } from '@ui/icons/message';
import { PersonIcon } from '@ui/icons/person';
import { Logo } from '@ui/logo/logo';
import { Navbar } from '@ui/navbar/navbar';
import { Sticker } from '@ui/sticker/sticker';
import { firstName } from '@utils/user';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType, CSSProperties, MouseEvent, SVGProps } from 'react';
import { useEffect, useState } from 'react';
import styles from './app-navbar.module.css';

const HOME = '/home';
const STATS = '/home/stats';
const PROFILE = '/home/profile';

type NavItem = {
  href: string;
  labelKey: 'home' | 'stats' | 'profile';
  blurbKey: 'homeBlurb' | 'statsBlurb' | 'profileBlurb';
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { href: HOME, labelKey: 'home', blurbKey: 'homeBlurb', Icon: MessageIcon },
  { href: STATS, labelKey: 'stats', blurbKey: 'statsBlurb', Icon: ChartIcon },
  {
    href: PROFILE,
    labelKey: 'profile',
    blurbKey: 'profileBlurb',
    Icon: PersonIcon,
  },
];

type PilePlacement = { tilt: string; shift: string };

/* Hand-placed tilt and nudge per card, so the menu reads as a loose pile
   of stickers rather than a list. Kept subtle so the labels stay easy to
   read. */
const CARD_PLACEMENTS: PilePlacement[] = [
  { tilt: '-1deg', shift: '0px' },
  { tilt: '0.8deg', shift: '14px' },
  { tilt: '-0.5deg', shift: '6px' },
];

/* Your own badge sits straight under the pile. */
const OWNER_PLACEMENT: PilePlacement = { tilt: '0deg', shift: '0px' };

function pileStyle(index: number, placement: PilePlacement): CSSProperties {
  return {
    '--pile-index': index,
    '--pile-tilt': placement.tilt,
    '--pile-shift': placement.shift,
  } as CSSProperties;
}

/** The app navbar for the signed-in user; suspends until the profile loads. */
export function AppNavbar() {
  const profile = useProfile();
  return <AppNavbarView profile={profile} />;
}

/**
 * The same navbar while the profile is still loading, for streamed page
 * shells. Your own name is left blank rather than guessed.
 */
export function AppNavbarPlaceholder() {
  return <AppNavbarView profile={undefined} />;
}

type AppNavbarViewProps = {
  /** `undefined` while the profile is still loading. */
  profile: Profile | null | undefined;
};

function AppNavbarView({ profile }: AppNavbarViewProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const isProfileLoading = profile === undefined;
  const { navigate } = useNavigationProgress();
  const isDesktop = useMediaQuery('(min-width: 721px)');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // The menu only exists on phones; don't leave it open on a wide window.
  useEffect(() => {
    if (isDesktop) setIsMenuOpen(false);
  }, [isDesktop]);

  const fullName = profile?.display_name?.trim() || t('profile');
  const shortName = firstName(
    profile?.display_name ?? null,
    profile?.email ?? null,
  );
  const [chat, stats, profileItem] = NAV_ITEMS;
  const currentItem = NAV_ITEMS.find(item => item.href === pathname) ?? chat;

  const goTo = (href: string) => (event: MouseEvent) => {
    event.preventDefault();
    setIsMenuOpen(false);
    if (href !== pathname) navigate(href);
  };

  const ariaCurrent = (href: string) =>
    href === pathname ? ('page' as const) : undefined;

  const brand = <Logo size="sm" className={styles['momo-app-navbar__logo']} />;
  const logo =
    pathname === HOME ? (
      brand
    ) : (
      <a
        href={HOME}
        onClick={goTo(HOME)}
        className={styles['momo-app-navbar__logo-link']}
      >
        {brand}
      </a>
    );

  const links = (
    <>
      <div className={styles['momo-app-navbar__stickers']}>
        {[chat, stats].map(item => (
          <Sticker
            key={item.href}
            as="a"
            href={item.href}
            onClick={goTo(item.href)}
            active={item.href === pathname}
            aria-current={ariaCurrent(item.href)}
          >
            {t(item.labelKey)}
          </Sticker>
        ))}
        <Sticker
          as="a"
          href={PROFILE}
          onClick={goTo(PROFILE)}
          active={pathname === PROFILE}
          aria-current={ariaCurrent(PROFILE)}
          shape="pill"
          className={styles['momo-app-navbar__me']}
        >
          <Avatar
            size="extra-small"
            displayName={fullName}
            slot={isProfileLoading ? <span aria-hidden="true" /> : undefined}
          />
          <span className={styles['momo-app-navbar__visually-hidden']}>
            {t('profile')}:{' '}
          </span>
          {isProfileLoading ? (
            <span
              aria-hidden="true"
              className={styles['momo-app-navbar__name-loading']}
            >
              {t('profile')}
            </span>
          ) : (
            shortName
          )}
        </Sticker>
      </div>

      <BaseDialog.Trigger className={styles['momo-app-navbar__menu-trigger']}>
        <span className={styles['momo-app-navbar__menu-here']}>
          {t(currentItem.labelKey)}
        </span>
        <span className={styles['momo-app-navbar__menu-glyph']}>
          <MenuIcon width={18} height={18} aria-hidden="true" />
          <span className={styles['momo-app-navbar__visually-hidden']}>
            {t('openMenu')}
          </span>
        </span>
      </BaseDialog.Trigger>
    </>
  );

  return (
    <BaseDialog.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <Navbar className={styles['momo-app-navbar']} logo={logo} links={links} />

      <BaseDialog.Portal>
        <BaseDialog.Popup className={styles['momo-app-navbar__menu']}>
          <BaseDialog.Title
            className={styles['momo-app-navbar__visually-hidden']}
          >
            {t('navigation')}
          </BaseDialog.Title>

          <header className={styles['momo-app-navbar__menu-head']}>
            <Logo size="sm" className={styles['momo-app-navbar__logo']} />
            <BaseDialog.Close
              className={styles['momo-app-navbar__menu-close']}
              aria-label={t('closeMenu')}
            >
              <CloseIcon width={22} height={22} aria-hidden="true" />
            </BaseDialog.Close>
          </header>

          <ul className={styles['momo-app-navbar__pile']}>
            {NAV_ITEMS.map((item, index) => (
              <li
                key={item.href}
                style={pileStyle(index, CARD_PLACEMENTS[index])}
                className={styles['momo-app-navbar__pile-item']}
              >
                <a
                  href={item.href}
                  onClick={goTo(item.href)}
                  aria-current={ariaCurrent(item.href)}
                  data-active={item.href === pathname ? '' : undefined}
                  className={styles['momo-app-navbar__card']}
                >
                  <span className={styles['momo-app-navbar__card-icon']}>
                    <item.Icon width={26} height={26} aria-hidden="true" />
                  </span>
                  <span className={styles['momo-app-navbar__card-text']}>
                    <span className={styles['momo-app-navbar__card-label']}>
                      {t(item.labelKey)}
                    </span>
                    <span className={styles['momo-app-navbar__card-blurb']}>
                      {t(item.blurbKey)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
            <li
              style={pileStyle(NAV_ITEMS.length, OWNER_PLACEMENT)}
              className={styles['momo-app-navbar__pile-item']}
            >
              <a
                href={profileItem.href}
                onClick={goTo(profileItem.href)}
                className={styles['momo-app-navbar__badge']}
              >
                <Avatar size="small" displayName={fullName} />
                <span className={styles['momo-app-navbar__badge-text']}>
                  <span className={styles['momo-app-navbar__badge-greeting']}>
                    {t('greeting')}
                  </span>
                  <span className={styles['momo-app-navbar__badge-name']}>
                    {fullName}
                  </span>
                </span>
              </a>
            </li>
          </ul>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
