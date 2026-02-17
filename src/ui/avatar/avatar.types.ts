import { MomoColor } from '@lib-types/common';
import type { CircleSize } from '@ui/circle/circle.types';

/** Re-export of {@link CircleSize} for Avatar-specific usage. */
export type AvatarSize = CircleSize;

export type AvatarProps = {
  /** Circle size preset. @default 'medium' */
  size?: AvatarSize;
  /** User's display name — the first character is rendered as the initial. Shows `?` when `null`. */
  displayName: string | null;
  /** Fill colour from the MoMo palette. @default 'sky-aqua' */
  color?: MomoColor;
  /** When provided, the avatar becomes clickable. */
  onClick?: () => void;
};
