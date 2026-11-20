import { MomoColor } from '@lib-types/common';
import type { CircleSize } from '@ui/circle/circle.types';
import type { ReactNode } from 'react';

/** Re-export of {@link CircleSize} for Avatar-specific usage. */
export type AvatarSize = CircleSize;

export type AvatarProps = {
  /** Circle size preset. @default 'medium' */
  size?: AvatarSize;
  /** User's display name — the first character is rendered as the initial. Shows `?` when `null`. */
  displayName: string | null;
  /** Fill colour from the MoMo palette. @default 'sky-aqua' */
  color?: MomoColor;
  /**
   * Any CSS colour (e.g. `var(--member-2)`) — overrides `color`. Use for
   * identity colours that live outside the six palette tokens.
   */
  fill?: string;
  /** Text colour for the initial when `fill` is set (e.g. `var(--member-2-ink)`). */
  ink?: string;
  /** When provided, the avatar becomes clickable. */
  onClick?: () => void;
  /** Optional content rendered inside the circle in place of the initial (e.g. brand logo, icon). */
  slot?: ReactNode;
};
