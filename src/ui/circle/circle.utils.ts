import type { CircleSize } from './circle.types';

function getSizeProperty(
  size: CircleSize,
  values: Record<CircleSize, number>,
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

export function getCircleSizeMultiplier(size: CircleSize): number {
  return getSizeProperty(size, {
    'extra-small': 2,
    small: 3,
    medium: 4,
    large: 5,
  });
}

export function getCircleShadow(size: CircleSize): number {
  return getSizeProperty(size, {
    'extra-small': 1,
    small: 2,
    medium: 3,
    large: 4,
  });
}

export function getCircleFontSize(size: CircleSize): number {
  return getSizeProperty(size, {
    'extra-small': 1,
    small: 1.25,
    medium: 2,
    large: 3,
  });
}

export function getCircleBorderWidth(size: CircleSize): number {
  return getSizeProperty(size, {
    'extra-small': 1,
    small: 2,
    medium: 3,
    large: 4,
  });
}
