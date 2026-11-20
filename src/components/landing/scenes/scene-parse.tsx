'use client';

import { ChatRowScope } from '@components/chat/chat-row';
import { ColorTicket } from '@components/chat/ticket';
import {
  type PreviewSample,
  previewLines,
  previewMessage,
} from '@components/landing/chat-preview';
import { ChatComposerMock } from '@components/landing/hero/chat-composer-mock';
import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { Highlight } from '@ui/highlight/highlight';
import { Typography } from '@ui/typography/typography';
import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import styles from './scene-parse.module.css';
import { SceneShell } from './scene-shell';

const ARROW_PATH_LENGTH = 92;
const TICKET_ID = 'landing-parse';

export function SceneParse() {
  const t = useTranslations('landing.parse');
  const sample = t.raw('chat') as PreviewSample;
  const artifactRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGPathElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inView = useInView(artifactRef, { threshold: 0.4, once: true });

  useGSAP(
    () => {
      const arrowEl = arrowRef.current;
      const ticketEl = ticketRef.current;
      if (!arrowEl || !ticketEl) return;

      if (reducedMotion) {
        gsap.set(arrowEl, { strokeDashoffset: 0 });
        gsap.set(ticketEl, { opacity: 1, scale: 1 });
        return;
      }

      if (!inView) {
        gsap.set(arrowEl, {
          strokeDasharray: ARROW_PATH_LENGTH,
          strokeDashoffset: ARROW_PATH_LENGTH,
        });
        gsap.set(ticketEl, { opacity: 0, scale: 0.8 });
        return;
      }

      const tl = gsap.timeline({ delay: 0.45 });
      tl.to(arrowEl, {
        strokeDashoffset: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
      tl.to(
        ticketEl,
        {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'back.out(2)',
          transformOrigin: 'center center',
        },
        '-=0.1',
      );
    },
    { scope: artifactRef, dependencies: [inView, reducedMotion] },
  );

  return (
    <SceneShell
      id="features"
      tilt={-2}
      layout="title-left"
      artifactMaxWidth={380}
      statement={
        <Typography
          as="h2"
          size="display"
          weight="bold"
          className={styles['momo-scene-parse__statement']}
        >
          {t.rich('statement', {
            primary: chunks => (
              <Highlight variant="primary">{chunks}</Highlight>
            ),
            feature: chunks => (
              <Highlight variant="feature" rotation="right">
                {chunks}
              </Highlight>
            ),
          })}
        </Typography>
      }
      artifact={
        <div ref={artifactRef} className={styles['momo-scene-parse']}>
          <div className={styles['momo-scene-parse__stack']}>
            <ChatComposerMock
              text={sample.text}
              ready
              className={styles['momo-scene-parse__composer']}
            />

            <svg
              className={styles['momo-scene-parse__arrow']}
              viewBox="0 0 32 64"
              aria-hidden
            >
              <path
                ref={arrowRef}
                d="M16 4 L16 50"
                stroke="var(--color-dark)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M8 44 L16 56 L24 44"
                stroke="var(--color-dark)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>

            <ChatRowScope
              ref={ticketRef}
              className={styles['momo-scene-parse__ticket']}
            >
              <ColorTicket
                message={previewMessage(TICKET_ID, sample, true)}
                lines={previewLines(TICKET_ID, sample) ?? []}
                isOwn={false}
              />
            </ChatRowScope>
          </div>
        </div>
      }
    />
  );
}
