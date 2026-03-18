import type { MarginProps, PaddingProps } from '@lib-types/common';
import {
  type ComponentPropsWithoutRef,
  type ElementType,
  PropsWithChildren,
} from 'react';

interface BaseFlexProps extends PropsWithChildren {
  /** Main-axis direction. @default 'row' */
  direction?: 'column' | 'row' | 'column-reverse' | 'row-reverse';
  /** Uniform gap (both axes) in spacing units. */
  gap?: number;
  /** Column gap in spacing units. Overrides `gap` on the inline axis. */
  gapX?: number;
  /** Row gap in spacing units. Overrides `gap` on the block axis. */
  gapY?: number;
  /** CSS `justify-content`. @default 'flex-start' */
  justifyContent?:
    | 'center'
    | 'flex-start'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  /** CSS `align-items`. @default 'flex-start' */
  alignItems?: 'center' | 'flex-start' | 'flex-end' | 'stretch' | 'baseline';
  /** CSS `flex-wrap`. @default 'nowrap' */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Render as `inline-flex` instead of `flex`. @default false */
  isInline?: boolean;
  /** Stretch to 100 % width. */
  isFullWidth?: boolean;
  /** Stretch to 100 % height. */
  isFullHeight?: boolean;
}

/**
 * Props for {@link Flex}.
 *
 * Merges flexbox layout, spacing (padding + margin), and all native props
 * of the underlying element (`as`).
 *
 * @typeParam T - Polymorphic HTML element. @default 'div'
 */
export type FlexProps<T extends ElementType = 'div'> = {
  /** Render as a different HTML element (e.g. `'section'`, `'nav'`). @default 'div' */
  as?: T;
} & BaseFlexProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BaseFlexProps | 'as'> &
  PaddingProps &
  MarginProps;
