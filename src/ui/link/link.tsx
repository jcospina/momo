import { cn } from '@utils/cn';
import NextLink, { type LinkProps } from 'next/link';
import type { PropsWithChildren } from 'react';

import type { PropsWithClassName } from '@lib-types/common';
import styles from './link.module.css';

export function Link({
  className,
  children,
  ...props
}: PropsWithChildren<PropsWithClassName<LinkProps>>) {
  return (
    <NextLink className={cn(styles['link'], className)} {...props}>
      {children}
    </NextLink>
  );
}
