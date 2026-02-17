import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';

import styles from './logo.module.css';

interface LogoProps {
  /** Override the displayed brand text. @default 'MoMo' */
  text?: string;
}

/**
 * Brand logo rendered with the MoMo display font.
 *
 * Applies the `momo-logo` CSS-module class which sets the typeface, size, and
 * colour. Pass a custom `className` for positioning or overrides.
 *
 * @example
 * ```tsx
 * <Logo />
 * <Logo text="Mo" className="my-custom-logo" />
 * ```
 */
export function Logo({
  className,
  text = 'MoMo',
}: PropsWithClassName<LogoProps>) {
  return <div className={cn(styles['momo-logo'], className)}>{text}</div>;
}
