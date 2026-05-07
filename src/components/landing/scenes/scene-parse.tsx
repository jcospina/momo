'use client';

import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { Highlight } from '@ui/highlight/highlight';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { Typography } from '@ui/typography/typography';
import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import styles from './scene-parse.module.css';
import { SceneShell } from './scene-shell';

const ARROW_PATH_LENGTH = 92;

export function SceneParse() {
  const t = useTranslations('landing.parse');
  const artifactRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGPathElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inView = useInView(artifactRef, { threshold: 0.4, once: true });

  useGSAP(
    () => {
      const arrowEl = arrowRef.current;
      const chipEl = chipRef.current;
      if (!arrowEl || !chipEl) return;

      if (reducedMotion) {
        gsap.set(arrowEl, { strokeDashoffset: 0 });
        gsap.set(chipEl, { opacity: 1, scale: 1 });
        return;
      }

      if (!inView) {
        gsap.set(arrowEl, {
          strokeDasharray: ARROW_PATH_LENGTH,
          strokeDashoffset: ARROW_PATH_LENGTH,
        });
        gsap.set(chipEl, { opacity: 0, scale: 0.8 });
        return;
      }

      const tl = gsap.timeline({ delay: 0.45 });
      tl.to(arrowEl, {
        strokeDashoffset: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
      tl.to(
        chipEl,
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
            <article className={styles['momo-scene-parse__bubble']}>
              <div className={styles['momo-scene-parse__bubble-row']}>
                <span
                  className={styles['momo-scene-parse__bubble-status']}
                  aria-hidden="true"
                >
                  <CircleCheckIcon width={22} height={22} />
                </span>
                <Typography
                  size="lg"
                  weight="regular"
                  className={styles['momo-scene-parse__bubble-text']}
                >
                  {t('chat.text')}
                </Typography>
              </div>
            </article>

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

            <section
              ref={chipRef}
              className={styles['momo-scene-parse__chip-row']}
            >
              <Typography
                as="span"
                size="xs"
                weight="bold"
                transform="uppercase"
                className={styles['momo-scene-parse__chip-label']}
              >
                {t('chip.label')}
              </Typography>
              <Highlight
                as="span"
                variant="feature"
                rotation="none"
                className={styles['momo-scene-parse__chip-badge']}
              >
                <Typography
                  as="span"
                  size="lg"
                  weight="bold"
                  className={styles['momo-scene-parse__chip-category']}
                >
                  {t('chip.category')}
                </Typography>
              </Highlight>
            </section>
          </div>
        </div>
      }
    />
  );
}
