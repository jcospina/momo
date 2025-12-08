'use client';
import { Avatar } from '@components/avatar/avatar';
import { Flex } from '@components/flex/flex';
import { useProfile } from '@providers/profile-provider';

import { mq, useMediaQuery } from '@/hooks/use-media-query';
import { FlexItem } from '@components/flex-item/flex-item';
import { Logo } from '@components/logo/logo';
import { usePathname, useRouter } from 'next/navigation';
import styles from './navbar.module.css';

export function Navbar() {
  const router = useRouter();
  const pathName = usePathname();
  const profile = useProfile();

  const isProfilePage = pathName === '/home/profile';

  const isSmallScreen = useMediaQuery(mq('(max-width: 768px)'));

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
      <FlexItem margin="auto">
        <Logo className={styles['momo-navbar__logo']} />
      </FlexItem>
      {!isProfilePage && (
        <Avatar
          size={isSmallScreen ? 'small' : 'medium'}
          variant="button"
          onClick={goToProfile}
          className={styles['momo-navbar__avatar']}
          displayName={profile?.display_name || '?'}
        />
      )}
    </Flex>
  );
}
