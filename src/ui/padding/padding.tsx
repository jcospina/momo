import type { PaddingProps } from '@lib-types/common';
import { getPaddingStyles } from '@utils/spacing';
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  PropsWithChildren,
} from 'react';

type PaddingComponentProps<T extends ElementType = 'div'> = {
  as?: T;
} & PropsWithChildren<PaddingProps> &
  Omit<
    ComponentPropsWithoutRef<T>,
    keyof PropsWithChildren<PaddingProps> | 'as'
  >;

/**
 * Applies padding via inline styles to a polymorphic wrapper element.
 *
 * Spacing values map to a base-unit scale (the conversion happens in
 * `getSpacingStyles`). Accepts all axis/side-specific overrides.
 *
 * @typeParam T - Underlying HTML element. @default 'div'
 *
 * @example
 * ```tsx
 * <Padding padding={3}>
 *   <Typography>Evenly padded content</Typography>
 * </Padding>
 *
 * <Padding as="section" paddingX={4} paddingY={2}>
 *   <Chart />
 * </Padding>
 * ```
 */
export function Padding<T extends ElementType>({
  as,
  children,
  padding,
  paddingX,
  paddingY,
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  style,
  ...props
}: PaddingComponentProps<T>) {
  const Component = as || 'div';
  const paddingStyles = getPaddingStyles({
    padding,
    paddingX,
    paddingY,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
  });
  const mergedStyle: CSSProperties = {
    ...paddingStyles,
    ...(style as CSSProperties),
  };
  return (
    <Component style={mergedStyle} {...props}>
      {children}
    </Component>
  );
}
