import { cn } from '@utils/cn';
import styles from './loader.module.css';
import { LoaderProps } from './loader.types';

export function MomoLoader({ size = 'md', className }: LoaderProps) {
  const sizeClass = `momo-loader--${size}`;

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(styles['momo-loader'], styles[sizeClass], className)}
    >
      <span className={styles['momo-loader__base']} aria-hidden="true">
        M
      </span>
      <span className={styles['momo-loader__fill']} aria-hidden="true">
        M
      </span>
    </span>
  );
}
