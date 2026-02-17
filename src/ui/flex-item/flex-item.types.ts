import type { MarginProps, PaddingProps } from '@lib-types/common';
import type {
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
} from 'react';

interface BaseFlexItemProps extends PropsWithChildren {
  /** CSS `order`. @default 0 */
  order?: number;
  /** CSS `flex-grow`. @default 0 */
  grow?: number;
  /** CSS `flex-shrink`. @default 1 */
  shrink?: number;
  /** CSS `flex-basis`. @default 'auto' */
  basis?: string;
  /** CSS `align-self` — override the parent Flex's `alignItems` for this child. */
  align?:
    | 'auto'
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'baseline'
    | 'stretch';
}

/**
 * Props for {@link FlexItem}.
 *
 * Extends flexbox child properties with spacing (padding + margin) and
 * polymorphic element support.
 *
 * @typeParam T - Polymorphic HTML element. @default 'div'
 */
export type FlexItemProps<T extends ElementType = 'div'> = {
  /** Render as a different HTML element. @default 'div' */
  as?: T;
} & BaseFlexItemProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BaseFlexItemProps | 'as'> &
  PaddingProps &
  MarginProps;
