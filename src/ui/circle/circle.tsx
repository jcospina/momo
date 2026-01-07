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

export function Circle({
  className,
  style,
  onClick,
  children,
  size = 'medium',
  color = 'sky-aqua',
}: CircleProps) {
  const circleStyles = {
    '--circle-size': getCircleSizeMultiplier(size),
    '--circle-shadow': getCircleShadow(size),
    '--circle-font-size': getCircleFontSize(size),
    '--circle-border-width': getCircleBorderWidth(size),
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
