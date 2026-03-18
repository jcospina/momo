import { cn } from '@utils/cn';
import type { ElementType } from 'react';
import styles from './typography.module.css';
import { TypographyProps } from './typography.types';
/**
 * Text rendering primitive with size, weight, and transform tokens.
 *
 * Maps semantic tokens (`size`, `weight`, `transform`) to BEM-style
 * CSS-module classes (`momo-typography--md`, `momo-typography--bold`, etc.).
 * Polymorphic — defaults to `<p>` but can render headings, spans, labels, etc.
 *
 * @typeParam T - Polymorphic HTML element. @default 'p'
 *
 * @example Heading
 * ```tsx
 * <Typography as="h1" size="xxl" weight="bold">
 *   Dashboard
 * </Typography>
 * ```
 *
 * @example Small uppercase label
 * ```tsx
 * <Typography as="span" size="xs" transform="uppercase">
 *   New
 * </Typography>
 * ```
 *
 * @example Default paragraph
 * ```tsx
 * <Typography>Regular body text.</Typography>
 * ```
 */
export function Typography<T extends ElementType = 'p'>({
  as,
  size = 'md',
  weight = 'regular',
  transform = 'none',
  className,
  ...props
}: TypographyProps<T>) {
  const Component = as || 'p';
  const sizeClass = `momo-typography--${size}`;
  const weightClass = `momo-typography--${weight}`;
  const transformClass = `momo-typography--${transform}`;

  return (
    <Component
      className={cn(
        styles['momo-typography'],
        styles[sizeClass],
        styles[weightClass],
        styles[transformClass],
        className,
      )}
      {...props}
    />
  );
}
