'use client';
import { Avatar } from '@/ui/avatar/avatar';
import { Flex } from '@/ui/flex/flex';
import { useProfile } from '@providers/profile-provider';

import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { Logo } from '@/ui/logo/logo';
import { Circle } from '@ui/circle/circle';
import { ChartIcon } from '@ui/icons/chart';
import { cn } from '@utils/cn';
import { usePathname, useRouter } from 'next/navigation';
import styles from './navbar.module.css';

export function Navbar() {
  const router = useRouter();
  const pathName = usePathname();
  const profile = useProfile();

  const isProfilePage = pathName === '/home/profile';

  const isBigScreen = useMediaQuery(mq('(min-width: 768px)'));

  const goToProfile = () => {
    router.push('/home/profile');
  };

  const goToStats = () => {
    router.push('/home/stats');
  };

  return (
    <nav className={styles['momo-navbar']}>
      <div
        className={cn(
          styles['momo-navbar__slot'],
          styles['momo-navbar__spacer'],
        )}
      />
      <a className={styles['momo-navbar__logo']} href="/home">
        <Logo />
      </a>
      <div className={styles['momo-navbar__slot']}>
        <Flex gap={2} justifyContent="flex-end" className="full-w">
          <Circle onClick={goToStats} color="mauve-magic">
            <ChartIcon width={30} height={30} />
          </Circle>
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
