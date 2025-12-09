import type { PaddingProps } from '@lib-types/common';
import { getPaddingStyles } from '@utils/spacing';
import type {
  ComponentPropsWithoutRef,
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
  return (
    <Component style={paddingStyles} {...props}>
      {children}
    </Component>
  );
}
