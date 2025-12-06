export type AvatarSize = 'small' | 'medium' | 'large';
interface BaseAvatarProps {
  size?: AvatarSize;
  displayName: string | null;
}
export interface DefaultAvatarProps extends BaseAvatarProps {
  variant?: 'default';
}

export interface ButtonAvatarProps extends BaseAvatarProps {
  variant: 'button';
  onClick: () => void;
}

export type AvatarProps = DefaultAvatarProps | ButtonAvatarProps;
