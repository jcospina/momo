import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';

import styles from './logo.module.css';

export type LogoSize = 'sm' | 'md' | 'lg' | 'fluid';

interface LogoProps {
  /** Override the displayed brand text. @default 'MoMo' */
  text?: string;
  /**
   * Visual size variant.
   * - `fluid` (default): responsive `clamp()` driven by viewport width.
   * - `sm` | `md` | `lg`: fixed font-size (2rem | 3rem | 5rem).
   * @default 'fluid'
   */
  size?: LogoSize;
}

/**
 * Brand logo rendered with the MoMo display font.
 *
 * Pass `size` to pick a fixed variant; otherwise the logo scales fluidly with
 * the viewport. Pass `className` for color or positioning overrides.
 *
 * @example
 * ```tsx
 * <Logo />
 * <Logo size="sm" />
 * <Logo text="Mo" className="my-custom-logo" />
 * ```
 */
export function Logo({
  className,
  text = 'MoMo',
  size = 'fluid',
}: PropsWithClassName<LogoProps>) {
  return (
    <div
      className={cn(
        styles['momo-logo'],
        styles[`momo-logo--${size}`],
        className,
      )}
    >
      {text}
    </div>
  );
}
