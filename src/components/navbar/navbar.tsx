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
