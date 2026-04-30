import { cn } from '@utils/cn';
import type { ElementType } from 'react';
import styles from './highlight.module.css';
import type { HighlightProps } from './highlight.types';

/**
 * Inline accent — bordered, hard-shadowed, slightly rotated.
 * Use to call out a few words inside a heading or paragraph.
 *
 * @example
 * ```tsx
 * <Typography as="h1" size="display" weight="bold">
 *   Track expenses by <Highlight>just typing</Highlight> them.
 * </Typography>
 * ```
 */
export function Highlight<T extends ElementType = 'span'>({
  as,
  variant = 'primary',
  rotation = 'left',
  className,
  children,
  ...props
}: HighlightProps<T>) {
  const Component = (as || 'span') as ElementType;
  return (
    <Component
      className={cn(
        styles['momo-highlight'],
        styles[`momo-highlight--${variant}`],
        styles[`momo-highlight--rotate-${rotation}`],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
