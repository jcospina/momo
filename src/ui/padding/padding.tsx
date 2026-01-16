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
