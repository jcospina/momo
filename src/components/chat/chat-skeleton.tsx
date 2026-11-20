'use client';

import { Avatar } from '@ui/avatar/avatar';
import { Button } from '@ui/button/button';
import { Flex } from '@ui/flex/flex';
import { SendIcon } from '@ui/icons/send';
import { Input } from '@ui/input/input';
import { Panel } from '@ui/panel/panel';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import chatStyles from './chat.module.css';
import skeletonStyles from './chat-skeleton.module.css';
import styles from './color-tickets.module.css';

// Ghost tickets, newest at the bottom like the real list.
const GHOST_TICKETS: Array<{ side: 'start' | 'end'; width: string }> = [
  { side: 'start', width: '42%' },
  { side: 'end', width: '36%' },
  { side: 'start', width: '48%' },
];

/**
 * The chat panel's frame (header, list, composer) drawn before its data
 * arrives, so the first paint already looks like the chat. It is inert: the
 * real panel replaces it as soon as the messages stream in.
 */
export function ChatSkeleton() {
  const t = useTranslations('chat.composer');
  const tCommon = useTranslations('common');

  return (
    <Panel marginBottom={2} className={chatStyles['momo-chat']}>
      <section
        className={styles.surface}
        aria-busy="true"
        aria-label={tCommon('loading')}
        inert
      >
        <Flex
          as="header"
          alignItems="center"
          justifyContent="space-between"
          wrap="wrap"
          gap={2}
          className={styles.header}
        >
          <Flex alignItems="center" gap={1.5}>
            <Avatar
              size="extra-small"
              displayName={null}
              fill="var(--rule)"
              slot={<span />}
            />
            <Typography as="h2" size="lg" weight="bold">
              <span className={skeletonStyles.title}>{'\u00a0'}</span>
            </Typography>
          </Flex>
        </Flex>
        <div className={styles.body}>
          <div className={skeletonStyles.list}>
            {GHOST_TICKETS.map((ticket, index) => (
              <span
                key={`${ticket.side}-${index}`}
                className={skeletonStyles.ticket}
                data-side={ticket.side}
                style={{ width: ticket.width }}
              />
            ))}
          </div>
        </div>
        <div className={styles.composer}>
          <div className={styles['composer__row']}>
            <Input
              multiline
              minRows={1}
              maxRows={4}
              readOnly
              tabIndex={-1}
              placeholder={t('placeholder')}
              aria-label={t('ariaLabel')}
              suffix={
                <Button
                  variant="icon"
                  type="button"
                  disabled
                  aria-label={t('send')}
                  className={styles.send}
                >
                  <SendIcon width={18} height={18} />
                </Button>
              }
            />
          </div>
        </div>
      </section>
    </Panel>
  );
}
