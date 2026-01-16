'use client';

import { useNavigationProgress } from '@/providers/navigation-progress-provider';
import { cn } from '@utils/cn';
import styles from './navigation-progress-bar.module.css';

export function NavigationProgressBar() {
  const { pending } = useNavigationProgress();

  return (
    <div
      className={cn(
        styles.navigationProgress,
        pending && styles['navigationProgress--active'],
      )}
      aria-hidden="true"
    >
      <div className={styles.navigationProgress__track}>
        <div className={styles.navigationProgress__indicator} />
      </div>
    </div>
  );
}
