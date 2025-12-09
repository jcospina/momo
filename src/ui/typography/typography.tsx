import { cn } from '@utils/cn';
import { TypographyProps } from './typography.types';

import type { ElementType } from 'react';
import styles from './typography.module.css';
export function Typography<T extends ElementType = 'p'>({
  as,
  size = 'md',
  weight = 'regular',
  transform = 'none',
  className,
  ...props
}: TypographyProps<T>) {
  const Component = as || 'p';
  const sizeClass = `momo-typography--${size}`;
  const weightClass = `momo-typography--${weight}`;
  const transformClass = `momo-typography--${transform}`;

  return (
    <Component
      className={cn(
        styles['momo-typography'],
        styles[sizeClass],
        styles[weightClass],
        styles[transformClass],
        className,
      )}
      {...props}
    />
  );
}
