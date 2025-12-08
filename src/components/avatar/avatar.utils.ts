import type { AvatarSize } from '@components/avatar/avatar.types';

export function getInitial(displayName: string | null) {
  const source = displayName?.trim();
  if (!source) return '?';
  return source.trim().charAt(0).toUpperCase();
}

function getSizeProperty(
  size: AvatarSize,
  values: Record<AvatarSize, number>,
): number {
  switch (size) {
    case 'extra-small':
      return values['extra-small'];
    case 'small':
      return values['small'];
    case 'large':
      return values['large'];
    case 'medium':
    default:
      return values['medium'];
  }
}

export function getAvatarSizeMultiplier(size: AvatarSize): number {
  return getSizeProperty(size, {
    'extra-small': 2,
    small: 3,
    medium: 4,
    large: 5,
  });
}

export function getAvatarShadow(size: AvatarSize): number {
  return getSizeProperty(size, {
    'extra-small': 1,
    small: 2,
    medium: 3,
    large: 4,
  });
}

export function getAvatarFontSize(size: AvatarSize): number {
  return getSizeProperty(size, {
    'extra-small': 1,
    small: 1.25,
    medium: 2,
    large: 3,
  });
}

export function getAvatarBorderWidth(size: AvatarSize): number {
  return getSizeProperty(size, {
    'extra-small': 1,
    small: 2,
    medium: 3,
    large: 4,
  });
}
