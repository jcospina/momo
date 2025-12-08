import { MomoColor } from '@lib-types/common';
export type AvatarSize = 'extra-small' | 'small' | 'medium' | 'large';
interface BaseAvatarProps {
  size?: AvatarSize;
  displayName: string | null;
  color?: MomoColor;
}
export interface DefaultAvatarProps extends BaseAvatarProps {
  variant?: 'default';
}

export interface ButtonAvatarProps extends BaseAvatarProps {
  variant: 'button';
  onClick: () => void;
}

export type AvatarProps = DefaultAvatarProps | ButtonAvatarProps;
