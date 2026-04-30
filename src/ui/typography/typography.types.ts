import {
  type ComponentPropsWithoutRef,
  type ElementType,
  PropsWithChildren,
} from 'react';

/** Font-size scale tokens. */
type Sizes = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'display';

/** Font-weight tokens. */
type Weight = 'light' | 'regular' | 'bold';

/** CSS `text-transform` values. */
type Transform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

interface BaseTypographyProps extends PropsWithChildren {
  /** Font-size token. @default 'md' */
  size?: Sizes;
  /** Font-weight token. @default 'regular' */
  weight?: Weight;
  /** CSS `text-transform`. @default 'none' */
  transform?: Transform;
}

/**
 * Props for {@link Typography}.
 *
 * @typeParam T - Polymorphic HTML element. @default 'p'
 */
export type TypographyProps<T extends ElementType = 'p'> = {
  /** Render as a different HTML element (e.g. `'h1'`, `'span'`, `'label'`). @default 'p' */
  as?: T;
} & BaseTypographyProps &
  Omit<ComponentPropsWithoutRef<T>, keyof PropsWithChildren | 'as'>;
