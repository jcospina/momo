import type { MarginProps, PaddingProps } from '@lib-types/common';
import type {
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
} from 'react';

interface BaseFlexItemProps extends PropsWithChildren {
  order?: number;
  /** flex-grow */
  grow?: number;
  /** flex-shrink */
  shrink?: number;
  /** flex-basis */
  basis?: string;
  /** align-self */
  align?:
    | 'auto'
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'baseline'
    | 'stretch';
}
export type FlexItemProps<T extends ElementType = 'div'> = {
  as?: T;
} & BaseFlexItemProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BaseFlexItemProps | 'as'> &
  PaddingProps &
  MarginProps;
