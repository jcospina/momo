import type { MarginProps, PaddingProps } from '@lib-types/common';
import {
  PropsWithChildren,
  type ComponentPropsWithoutRef,
  type ElementType,
} from 'react';

export type PanelProps<T extends ElementType = 'div'> = {
  as?: T;
} & PropsWithChildren &
  Omit<ComponentPropsWithoutRef<T>, keyof PropsWithChildren | 'as'> &
  PaddingProps &
  MarginProps;
