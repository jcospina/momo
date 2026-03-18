'use client';
import { useProfile } from '@providers/profile-provider';
import { Circle } from '@ui/circle/circle';
import { ChartIcon } from '@ui/icons/chart';
import { MessageIcon } from '@ui/icons/message';
import { cn } from '@utils/cn';
import { usePathname } from 'next/navigation';
import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { useNavigationProgress } from '@/providers/navigation-progress-provider';
import { Avatar } from '@/ui/avatar/avatar';
import { Flex } from '@/ui/flex/flex';
import { Logo } from '@/ui/logo/logo';
import styles from './navbar.module.css';

export function Navbar() {
  const pathName = usePathname();
  const profile = useProfile();
  const { navigate } = useNavigationProgress();

  const isHomePage = pathName === '/home';
  const isProfilePage = pathName === '/home/profile';
  const isStatsPage = pathName === '/home/stats';

  const isBigScreen = useMediaQuery(mq('(min-width: 768px)'));

  const goToProfile = () => {
    navigate('/home/profile');
  };

  const goToStats = () => {
    navigate('/home/stats');
  };

  const goToHome = () => {
    navigate('/home');
  };

  return (
    <nav className={styles['momo-navbar']}>
      <div
        className={cn(
          styles['momo-navbar__slot'],
          styles['momo-navbar__spacer'],
        )}
      />
      <a
        className={styles['momo-navbar__logo']}
        href="/home"
        onClick={event => {
          event.preventDefault();
          goToHome();
        }}
      >
        <Logo />
      </a>
      <div className={styles['momo-navbar__slot']}>
        <Flex gap={2} justifyContent="flex-end" className="full-w">
          {!isHomePage && (
            <Circle onClick={goToHome} color="amber-glow">
              <MessageIcon width={30} height={30} />
            </Circle>
          )}
          {!isStatsPage && (
            <Circle onClick={goToStats} color="mauve-magic">
              <ChartIcon width={30} height={30} />
            </Circle>
          )}
          {!isProfilePage && (
            <Avatar
              size={isBigScreen ? 'medium' : 'small'}
              onClick={goToProfile}
              className={styles['momo-navbar__avatar']}
              displayName={profile?.display_name || '?'}
            />
          )}
        </Flex>
      </div>
    </nav>
  );
}
