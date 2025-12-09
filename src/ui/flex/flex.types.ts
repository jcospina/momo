import type { MarginProps, PaddingProps } from '@lib-types/common';
import {
  PropsWithChildren,
  type ComponentPropsWithoutRef,
  type ElementType,
} from 'react';
interface BaseFlexProps extends PropsWithChildren {
  direction?: 'column' | 'row' | 'column-reverse' | 'row-reverse';
  gap?: number;
  gapX?: number;
  gapY?: number;
  justifyContent?:
    | 'center'
    | 'flex-start'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  alignItems?: 'center' | 'flex-start' | 'flex-end' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  isInline?: boolean;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
}

export type FlexProps<T extends ElementType = 'div'> = {
  as?: T;
} & BaseFlexProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BaseFlexProps | 'as'> &
  PaddingProps &
  MarginProps;
