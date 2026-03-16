import { Typography } from '@ui/typography/typography';

import styles from './chat-date-separator.module.css';

export function ChatDateSeparator({ label }: { label: string }) {
  return (
    <div className={styles.separator}>
      <Typography as="span" size="sm" className={styles.label}>
        {label}
      </Typography>
    </div>
  );
}
