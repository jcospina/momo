import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';

import styles from './logo.module.css';

export function Logo({ className }: PropsWithClassName) {
  return <div className={cn(styles['momo-logo'], className)}>MoMo</div>;
}
