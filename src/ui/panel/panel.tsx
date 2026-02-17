import { cn } from '@utils/cn';
import { PanelProps } from './panel.types';

import { getSpacingStyles } from '@utils/spacing';
import type { CSSProperties, ElementType } from 'react';
import styles from './panel.module.css';

/**
 * Rounded card/panel container with an optional drop-shadow.
 *
 * Use `Panel` to visually group content into a distinct surface.
 * Supports all padding/margin spacing props and polymorphic rendering.
 *
 * @typeParam T - Polymorphic HTML element. @default 'div'
 *
 * @example Default card with padding
 * ```tsx
 * <Panel padding={3}>
 *   <Typography>Card content</Typography>
 * </Panel>
 * ```
 *
 * @example Flat panel (no shadow) as a section
 * ```tsx
 * <Panel as="section" shadowless paddingX={4} paddingY={2}>
 *   <Typography>Section content</Typography>
 * </Panel>
 * ```
 */
export function Panel<T extends ElementType>({
  className,
  children,
  as,
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
  shadowless,
  ...props
}: PanelProps<T>) {
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
  const inlineStyle = style as CSSProperties | undefined;
  const mergedStyle: CSSProperties = {
    ...spacingStyles,
    ...(inlineStyle || {}),
  };

  return (
    <Component
      className={cn(
        styles['momo-panel'],
        shadowless && styles['momo-panel--shadowless'],
        className,
      )}
      style={mergedStyle}
      {...props}
    >
      {children}
    </Component>
  );
}
