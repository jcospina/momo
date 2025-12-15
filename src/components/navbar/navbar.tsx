'use client';
import { Avatar } from '@/ui/avatar/avatar';
import { Flex } from '@/ui/flex/flex';
import { useProfile } from '@providers/profile-provider';

import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { FlexItem } from '@/ui/flex-item/flex-item';
import { Logo } from '@/ui/logo/logo';
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

  return (
    <Flex
      as="nav"
      isFullWidth
      alignItems="center"
      className={styles['momo-navbar']}
    >
      <FlexItem as="a" className={styles['momo-navbar__logo']} href="/home">
        <Logo />
      </FlexItem>
      {!isProfilePage && (
        <Avatar
          size={isBigScreen ? 'medium' : 'small'}
          variant="button"
          onClick={goToProfile}
          className={styles['momo-navbar__avatar']}
          displayName={profile?.display_name || '?'}
        />
      )}
    </Flex>
  );
}
