import type { ComponentProps, ElementType, PropsWithChildren } from 'react';

export type HighlightVariant = 'primary' | 'feature' | 'info' | 'warm';
export type HighlightRotation = 'left' | 'right' | 'none';

interface BaseHighlightProps extends PropsWithChildren {
  /** Background accent token. @default 'primary' */
  variant?: HighlightVariant;
  /** Slight rotation for hand-stamped feel. @default 'left' */
  rotation?: HighlightRotation;
  /**
   * When true, renders in a hidden initial state (`clip-path: inset(0 100% 0 0)`)
   * so a consumer can animate the `clip-path` to reveal the highlight like a
   * marker stroke. Default false (renders fully painted, current behavior).
   */
  animate?: boolean;
}

export type HighlightProps<T extends ElementType = 'span'> = {
  /** Render as a different element. @default 'span' */
  as?: T;
} & BaseHighlightProps &
  Omit<ComponentProps<T>, keyof PropsWithChildren | 'as'>;
