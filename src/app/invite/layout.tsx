import { Flex } from '@/ui/flex/flex';

import type { ReactNode } from 'react';
import styles from './invite.module.css';
export default function InviteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Flex
      direction="column"
      className={styles['invite-page']}
      justifyContent="center"
      alignItems="center"
      padding={3}
    >
      {children}
    </Flex>
  );
}
