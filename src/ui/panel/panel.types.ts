import type { MarginProps, PaddingProps } from '@lib-types/common';
import {
  PropsWithChildren,
  type ComponentPropsWithoutRef,
  type ElementType,
} from 'react';

interface BasePanelProps extends PropsWithChildren {
  /** Remove the default box-shadow. @default false */
  shadowless?: boolean;
}

/**
 * Props for {@link Panel}.
 *
 * @typeParam T - Polymorphic HTML element. @default 'div'
 */
export type PanelProps<T extends ElementType = 'div'> = {
  /** Render as a different HTML element. @default 'div' */
  as?: T;
} & BasePanelProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BasePanelProps | 'as'> &
  PaddingProps &
  MarginProps;
