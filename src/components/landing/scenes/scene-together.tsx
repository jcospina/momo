'use client';

import { ChatMessageBubble } from '@components/chat/chat-message-bubble';
import { Avatar } from '@ui/avatar/avatar';
import { Highlight } from '@ui/highlight/highlight';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { Typography } from '@ui/typography/typography';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { SceneShell } from './scene-shell';
import styles from './scene-together.module.css';

// Below-the-fold chart: defer the visx/d3 bundle out of the landing's initial
// JS. The ring container reserves a 1:1 aspect-ratio box in CSS, so the lazy
// mount does not shift layout.
const LandingMiniRing = dynamic(
  () => import('./charts/landing-mini-ring').then(m => m.LandingMiniRing),
  { ssr: false },
);

type ThreadMessage = {
  text: string;
  time?: string;
};

export function SceneTogether() {
  const t = useTranslations('landing.together');

  const thread = useMemo<ThreadMessage[]>(() => {
    const raw = t.raw('thread') as ThreadMessage[] | undefined;
    return raw ?? [];
  }, [t]);

  const ringData = [
    { name: t('ring.left'), value: 62 },
    { name: t('ring.right'), value: 38 },
  ];

  return (
    <SceneShell
      id="how"
      tilt={-0.9}
      layout="title-right"
      statementDesktopBasis="40%"
      artifactDesktopBasis="60%"
      statement={
        <Typography
          as="h2"
          size="display"
          weight="bold"
          className={styles['momo-scene-together__statement']}
        >
          {t.rich('statement', {
            info: chunks => (
              <Highlight variant="info" rotation="right">
                {chunks}
              </Highlight>
            ),
          })}
        </Typography>
      }
      artifact={
        <div className={styles['momo-scene-together']}>
          <header className={styles['momo-scene-together__header']}>
            <Typography
              as="span"
              size="sm"
              weight="bold"
              className={styles['momo-scene-together__household-name']}
            >
              {t('householdName')}
            </Typography>
            <Typography
              as="span"
              size="sm"
              className={styles['momo-scene-together__header-meta']}
            >
              {t('ring.totalLabel')}
            </Typography>
          </header>

          <div className={styles['momo-scene-together__content']}>
            <section className={styles['momo-scene-together__column']}>
              <div className={styles['momo-scene-together__thread']}>
                {thread.map((msg, index) => {
                  const isOwn = index === 1;
                  const isExpense = index === 0;
                  return (
                    <ChatMessageBubble
                      key={`together-msg-${index}`}
                      text={msg.text}
                      isOwn={isOwn}
                      timestamp={msg.time}
                      senderName={isOwn ? null : 'Martín'}
                      avatarSlot={
                        isOwn ? null : (
                          <Avatar
                            size="extra-small"
                            displayName="M"
                            color="mauve-magic"
                          />
                        )
                      }
                      statusSlot={
                        isExpense ? (
                          <CircleCheckIcon width={18} height={18} />
                        ) : null
                      }
                      actionsSlot={
                        isOwn ? <ThreeDotsIcon width={16} height={16} /> : null
                      }
                      skipMountAnimation
                    />
                  );
                })}
              </div>
            </section>

            <div
              aria-hidden
              className={styles['momo-scene-together__divider']}
            />

            <section
              className={`${styles['momo-scene-together__column']} ${styles['momo-scene-together__column--stats']}`}
              aria-label={t('eyebrow.statsAria')}
            >
              <div className={styles['momo-scene-together__ring-row']}>
                <div className={styles['momo-scene-together__ring']}>
                  <LandingMiniRing
                    data={ringData}
                    ariaLabel={t('ring.ariaLabel')}
                  />
                  <div
                    className={styles['momo-scene-together__ring-center']}
                    aria-hidden
                  >
                    <Typography
                      as="span"
                      size="lg"
                      weight="bold"
                      className={
                        styles['momo-scene-together__ring-center-value']
                      }
                    >
                      {t('ring.total')}
                    </Typography>
                  </div>
                </div>
                <ul
                  className={styles['momo-scene-together__legend']}
                  aria-hidden
                >
                  <li>
                    <span
                      className={styles['momo-scene-together__legend-dot']}
                      style={{ background: 'var(--chart-1)' }}
                    />
                    <span>
                      {t('ring.left')} · {t('ring.leftAmount')}
                    </span>
                  </li>
                  <li>
                    <span
                      className={styles['momo-scene-together__legend-dot']}
                      style={{ background: 'var(--chart-2)' }}
                    />
                    <span>
                      {t('ring.right')} · {t('ring.rightAmount')}
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      }
    />
  );
}
