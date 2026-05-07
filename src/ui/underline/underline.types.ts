import type {
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
} from 'react';

export type UnderlineVariant = 'primary' | 'feature' | 'info' | 'warm';
export type UnderlineSize = 'sm' | 'md' | 'lg';

interface BaseUnderlineProps extends PropsWithChildren {
  /** Underline accent token. @default 'feature' */
  variant?: UnderlineVariant;
  /** Stroke thickness + baseline offset preset. @default 'md' */
  size?: UnderlineSize;
}

export type UnderlineProps<T extends ElementType = 'span'> = {
  /** Render as a different element. @default 'span' */
  as?: T;
} & BaseUnderlineProps &
  Omit<ComponentPropsWithoutRef<T>, keyof PropsWithChildren | 'as'>;
