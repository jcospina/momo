import { cn } from '@utils/cn';
import NextLink, { type LinkProps } from 'next/link';
import type { PropsWithChildren } from 'react';

import type { PropsWithClassName } from '@lib-types/common';
import styles from './link.module.css';

/**
 * Styled wrapper around Next.js `Link`.
 *
 * Applies the MoMo link styles (colour, underline, hover state) while
 * forwarding all `next/link` props (prefetch, replace, scroll, etc.).
 *
 * @example
 * ```tsx
 * <Link href="/home">Go home</Link>
 * <Link href="/settings" className="nav-link">Settings</Link>
 * ```
 */
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
