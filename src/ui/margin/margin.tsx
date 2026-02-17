import type { MarginProps } from '@lib-types/common';
import { getMarginStyles } from '@utils/spacing';
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  PropsWithChildren,
} from 'react';

type MarginComponentProps<T extends ElementType = 'div'> = {
  as?: T;
} & PropsWithChildren<MarginProps> &
  Omit<
    ComponentPropsWithoutRef<T>,
    keyof PropsWithChildren<MarginProps> | 'as'
  >;

/**
 * Applies margin via inline styles to a polymorphic wrapper element.
 *
 * Spacing values map to a base-unit scale (the conversion happens in
 * `getSpacingStyles`). Supports `'auto'` for centering patterns.
 *
 * @typeParam T - Underlying HTML element. @default 'div'
 *
 * @example
 * ```tsx
 * <Margin marginBottom={2}>
 *   <Typography>Spaced below</Typography>
 * </Margin>
 *
 * <Margin as="nav" marginX="auto">
 *   <Logo />
 * </Margin>
 * ```
 */
export function Margin<T extends ElementType>({
  as,
  children,
  margin,
  marginX,
  marginY,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  style,
  ...props
}: MarginComponentProps<T>) {
  const Component = as || 'div';
  const marginStyles = getMarginStyles({
    margin,
    marginX,
    marginY,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
  });
  const mergedStyle: CSSProperties = {
    ...marginStyles,
    ...(style as CSSProperties),
  };
  return (
    <Component style={mergedStyle} {...props}>
      {children}
    </Component>
  );
}
