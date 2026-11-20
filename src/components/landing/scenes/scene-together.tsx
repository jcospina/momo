'use client';

import { ChatRowScope, type RowAuthor } from '@components/chat/chat-row';
import {
  PREVIEW_PARTNER_SLOT,
  PreviewChatRow,
  type PreviewSample,
} from '@components/landing/chat-preview';
import { Highlight } from '@ui/highlight/highlight';
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

/** The reader writes the second message; the partner the others. */
const OWN_MESSAGE_INDEX = 1;

export function SceneTogether() {
  const t = useTranslations('landing.together');

  const thread = useMemo<PreviewSample[]>(() => {
    const raw = t.raw('thread') as PreviewSample[] | undefined;
    return raw ?? [];
  }, [t]);
  const partner: RowAuthor = {
    name: t('ring.right'),
    slot: PREVIEW_PARTNER_SLOT,
  };

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
              <ChatRowScope
                className={styles['momo-scene-together__thread']}
                inert
              >
                {thread.map((sample, index) => (
                  <PreviewChatRow
                    key={`together-msg-${index}`}
                    id={`together-${index}`}
                    sample={sample}
                    author={index === OWN_MESSAGE_INDEX ? null : partner}
                    isProcessed
                    isGroupStart
                    isGroupEnd
                    isFresh={false}
                  />
                ))}
              </ChatRowScope>
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
