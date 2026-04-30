import type {
  ComponentPropsWithoutRef,
  ElementType,
  PropsWithChildren,
} from 'react';

export type HighlightVariant = 'primary' | 'feature' | 'info' | 'warm';
export type HighlightRotation = 'left' | 'right' | 'none';

interface BaseHighlightProps extends PropsWithChildren {
  /** Background accent token. @default 'primary' */
  variant?: HighlightVariant;
  /** Slight rotation for hand-stamped feel. @default 'left' */
  rotation?: HighlightRotation;
}

export type HighlightProps<T extends ElementType = 'span'> = {
  /** Render as a different element. @default 'span' */
  as?: T;
} & BaseHighlightProps &
  Omit<ComponentPropsWithoutRef<T>, keyof PropsWithChildren | 'as'>;
