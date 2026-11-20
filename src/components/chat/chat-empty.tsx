'use client';

import { QUICK_PICK_CATEGORIES } from '@constants/expenses/categories';
import { Flex } from '@ui/flex/flex';
import { Panel } from '@ui/panel/panel';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import styles from './color-tickets.module.css';
import { tintStyle } from './ticket';

export function ChatEmpty() {
  const t = useTranslations('chat.empty');
  return (
    <div className={styles.empty}>
      <Panel padding={3} className={styles['empty__card']}>
        <Flex direction="column" alignItems="center" gap={1}>
          <span className={styles['empty__swatches']} aria-hidden>
            {QUICK_PICK_CATEGORIES.slice(0, 5).map(category => (
              <span key={category} style={tintStyle(category)} />
            ))}
          </span>
          <Typography as="h3" size="lg" weight="bold">
            {t('title')}
          </Typography>
          <Typography as="p" size="sm" className={styles.muted}>
            {t('body')}
          </Typography>
        </Flex>
      </Panel>
    </div>
  );
}
