import type { MomoColor } from '@lib-types/common';
import type { CSSProperties, PropsWithChildren } from 'react';

/**
 * Available size presets for {@link Circle}.
 *
 * Each maps to a multiplier that drives `--circle-size`, `--circle-shadow`,
 * `--circle-font-size`, and `--circle-border-width` CSS custom properties.
 *
 * | Size           | Multiplier |
 * |----------------|------------|
 * | `'extra-small'`| 2          |
 * | `'small'`      | 3          |
 * | `'medium'`     | 4          |
 * | `'large'`      | 5          |
 */
export type CircleSize = 'extra-small' | 'small' | 'medium' | 'large';

export type CircleProps = PropsWithChildren<{
  /** Size preset — controls diameter, shadow, font, and border. @default 'medium' */
  size?: CircleSize;
  /** Fill colour from the MoMo palette. Maps to `var(--color-<color>)`. @default 'sky-aqua' */
  color?: MomoColor;
  className?: string;
  style?: CSSProperties;
  /** When provided the circle renders as a clickable element. */
  onClick?: () => void;
}>;
