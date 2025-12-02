import { cn } from '@utils/cn';
import { PanelProps } from './panel.types';

import type React from 'react';
import styles from './panel.module.css';

export function Panel<T extends React.ElementType>({
  className,
  children,
  as,
  ...props
}: PanelProps<T>) {
  const Component = as || 'div';
  return (
    <Component className={cn(styles['momo-panel'], className)} {...props}>
      {children}
    </Component>
  );
}
