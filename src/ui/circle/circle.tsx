import { cn } from '@utils/cn';
import type { CSSProperties } from 'react';
import styles from './circle.module.css';
import {
  getCircleBorderWidth,
  getCircleFontSize,
  getCircleShadow,
  getCircleSizeMultiplier,
} from './circle.utils';
import type { CircleProps } from './circle.types';

/**
 * Coloured circle primitive used as the building block for {@link Avatar} and
 * other badge-like elements.
 *
 * Supports four size presets that scale diameter, shadow, font-size, and border
 * width via CSS custom properties. On mobile viewports the size automatically
 * steps down one notch (large → medium, medium → small) for tighter layouts.
 *
 * Passing `onClick` adds a button-like cursor style.
 *
 * @example
 * ```tsx
 * <Circle size="small" color="vibrant-coral">!</Circle>
 * <Circle onClick={() => console.log('clicked')}>A</Circle>
 * ```
 */
export function Circle({
  className,
  style,
  onClick,
  children,
  size = 'medium',
  color = 'sky-aqua',
}: CircleProps) {
  const mobileSize =
    size === 'large' ? 'medium' : size === 'medium' ? 'small' : size;
  const circleStyles = {
    '--circle-size': getCircleSizeMultiplier(size),
    '--circle-shadow': getCircleShadow(size),
    '--circle-font-size': getCircleFontSize(size),
    '--circle-border-width': getCircleBorderWidth(size),
    '--circle-size-mobile': getCircleSizeMultiplier(mobileSize),
    '--circle-shadow-mobile': getCircleShadow(mobileSize),
    '--circle-font-size-mobile': getCircleFontSize(mobileSize),
    '--circle-border-width-mobile': getCircleBorderWidth(mobileSize),
    backgroundColor: `var(--color-${color})`,
    ...(style || {}),
  } as CSSProperties;

  return (
    <div
      style={circleStyles}
      className={cn(
        styles['momo-circle'],
        onClick && styles['momo-circle--button'],
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
