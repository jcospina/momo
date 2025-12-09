import type { MarginProps, PaddingProps } from '@lib-types/common';
import {
  PropsWithChildren,
  type ComponentPropsWithoutRef,
  type ElementType,
} from 'react';

interface BasePanelProps extends PropsWithChildren {
  shadowless?: boolean;
}
export type PanelProps<T extends ElementType = 'div'> = {
  as?: T;
} & BasePanelProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BasePanelProps | 'as'> &
  PaddingProps &
  MarginProps;
