import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';
import { getGapStyles } from '@utils/gap';
import { getSpacingStyles } from '@utils/spacing';
import type { CSSProperties, ElementType } from 'react';
import { FlexProps } from '@/ui/flex/flex.types';
import styles from './flex.module.css';

/**
 * Flexbox container with built-in spacing, gap, and alignment props.
 *
 * Renders as a `<div>` by default; use the `as` prop for semantic HTML.
 * Supports all padding/margin spacing props, individual gap axes, and
 * boolean flags for common layout needs (`isFullWidth`, `isInline`, etc.).
 *
 * @typeParam T - Polymorphic HTML element. @default 'div'
 *
 * @example Row with gap and centred items
 * ```tsx
 * <Flex gap={2} alignItems="center">
 *   <Avatar displayName="Alice" size="small" />
 *   <Typography>Alice</Typography>
 * </Flex>
 * ```
 *
 * @example Column layout with padding
 * ```tsx
 * <Flex direction="column" gap={3} paddingX={4} paddingY={2}>
 *   <Input placeholder="Name" />
 *   <Input placeholder="Email" />
 * </Flex>
 * ```
 *
 * @example Full-width footer with space-between
 * ```tsx
 * <Flex as="footer" justifyContent="space-between" isFullWidth>
 *   <Link href="/privacy">Privacy</Link>
 *   <Link href="/terms">Terms</Link>
 * </Flex>
 * ```
 */
export function Flex<T extends ElementType>({
  as,
  className,
  direction = 'row',
  gap,
  gapX,
  gapY,
  justifyContent = 'flex-start',
  alignItems = 'flex-start',
  wrap = 'nowrap',
  isInline = false,
  isFullHeight,
  isFullWidth,
  children,
  style,
  padding,
  paddingX,
  paddingY,
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  margin,
  marginX,
  marginY,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  ...props
}: PropsWithClassName<FlexProps<T>>) {
  const Component = as || 'div';

  const spacingStyles: CSSProperties = getSpacingStyles({
    padding,
    paddingX,
    paddingY,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    margin,
    marginX,
    marginY,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
  });

  const gapStyles = getGapStyles(gap, gapX, gapY);

  const flexStyles = {
    flexDirection: direction,
    justifyContent,
    alignItems,
    flexWrap: wrap,
  } as CSSProperties;
  const inlineStyle = style as CSSProperties | undefined;
  const mergedStyle: CSSProperties = {
    ...gapStyles,
    ...flexStyles,
    ...spacingStyles,
    ...(inlineStyle || {}),
  };
  return (
    <Component
      style={mergedStyle}
      className={cn(
        styles['momo-flex'],
        isInline && styles['momo-flex--inline'],
        isFullHeight && styles['momo-flex--full-h'],
        isFullWidth && styles['momo-flex--full-w'],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
