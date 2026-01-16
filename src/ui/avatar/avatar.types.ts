import { MomoColor } from '@lib-types/common';
import type { CircleSize } from '@ui/circle/circle.types';

export type AvatarSize = CircleSize;

export type AvatarProps = {
  size?: AvatarSize;
  displayName: string | null;
  color?: MomoColor;
  onClick?: () => void;
};
