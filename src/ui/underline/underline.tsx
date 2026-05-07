import { cn } from '@utils/cn';
import type { ElementType } from 'react';
import styles from './underline.module.css';
import type { UnderlineProps } from './underline.types';

/**
 * Inline accent — thick colored underline beneath a span of text.
 * Sibling of `Highlight`; use to call out a few words inside a heading or paragraph.
 *
 * @example
 * ```tsx
 * <Typography as="h1" size="display" weight="bold">
 *   It's <Underline variant="feature">that simple</Underline>.
 * </Typography>
 * ```
 */
export function Underline<T extends ElementType = 'span'>({
  as,
  variant = 'feature',
  size = 'md',
  className,
  children,
  ...props
}: UnderlineProps<T>) {
  const Component = (as || 'span') as ElementType;
  return (
    <Component
      className={cn(
        styles['momo-underline'],
        styles[`momo-underline--${variant}`],
        styles[`momo-underline--size-${size}`],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
