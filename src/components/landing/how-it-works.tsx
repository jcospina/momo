'use client';

import { useGSAP } from '@gsap/react';
import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollProgress, useScrollTick } from '@hooks/use-scroll-progress';
import { Highlight } from '@ui/highlight/highlight';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import howStyles from './how-it-works.module.css';
import styles from './landing.module.css';

gsap.registerPlugin(useGSAP);

const STEP_VARIANTS = ['primary', 'feature', 'info'] as const;

const TITLE_DURATION = 0.4;
const PANEL_DURATION = 0.6;
const PANEL_START = 0.8;
const CONTENT_START = PANEL_START + PANEL_DURATION;

function Step({
  number,
  variant,
  title,
  body,
}: {
  number: number;
  variant: (typeof STEP_VARIANTS)[number];
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className={howStyles['momo-landing-step']}>
      <div
        className={cn(
          howStyles['momo-landing-step__num'],
          howStyles[`momo-landing-step__num--${variant}`],
        )}
      >
        <Typography as="span" size="xl" weight="bold">
          {number}
        </Typography>
      </div>
      <div>
        <Typography
          as="h4"
          size="lg"
          weight="bold"
          className={howStyles['momo-landing-step__title']}
        >
          {title}
        </Typography>
        <Typography className={howStyles['momo-landing-step__body']}>
          {body}
        </Typography>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const t = useTranslations('landing.how');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const sectionRef = useRef<HTMLElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const getProgress = useScrollProgress(sectionRef, {
    start: 'top-bottom',
    end: 'bottom-bottom',
  });

  useGSAP(
    () => {
      if (reducedMotion) return;
      const head = headRef.current;
      const panel = panelRef.current;
      const content = contentRef.current;
      if (!head || !panel || !content) return;

      const tl = gsap.timeline({ paused: true });
      gsap.set(head, { opacity: 0, y: 40 });
      gsap.set(panel, { opacity: 0, y: 32, scale: 0.95 });
      gsap.set(content, { opacity: 0 });
      tl.to(
        head,
        {
          opacity: 1,
          y: 0,
          duration: TITLE_DURATION,
          ease: 'power3.out',
        },
        0,
      );
      tl.to(
        panel,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: PANEL_DURATION,
          ease: 'back.out(2.4)',
        },
        PANEL_START,
      );
      tl.set(content, { opacity: 1 }, CONTENT_START);
      tlRef.current = tl;

      return () => {
        tl.kill();
        tlRef.current = null;
      };
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  );

  useScrollTick(() => {
    if (reducedMotion) return;
    const tl = tlRef.current;
    if (!tl) return;
    tl.progress(getProgress());
  });

  return (
    <section
      ref={sectionRef}
      id="how"
      className={cn(
        styles['momo-landing__section'],
        howStyles['momo-landing-how-section'],
        reducedMotion && howStyles['momo-landing-how-section--static'],
      )}
    >
      <div className={howStyles['momo-landing-how-section__sticky']}>
        <div ref={headRef} className={howStyles['momo-landing-how__heading']}>
          <Typography
            as="h2"
            size="xxl"
            weight="bold"
            className={styles['momo-landing-section-head__title']}
          >
            {t.rich('title', {
              primary: chunks => (
                <Highlight variant="primary" rotation="left">
                  {chunks}
                </Highlight>
              ),
            })}
          </Typography>
        </div>
        <div ref={panelRef} className={howStyles['momo-landing-how']}>
          <div ref={contentRef} className={howStyles['momo-landing-how__grid']}>
            <div>
              <Typography
                as="h3"
                size="xxl"
                weight="bold"
                className={styles['momo-landing-section-head__title']}
              >
                {t('heading')}
              </Typography>
              <div
                className={howStyles['momo-landing-how__steps']}
                style={{ marginTop: 'var(--space-3)' }}
              >
                {STEP_VARIANTS.map((variant, index) => {
                  const stepKey = `step${index + 1}` as
                    | 'step1'
                    | 'step2'
                    | 'step3';
                  return (
                    <Step
                      key={stepKey}
                      number={index + 1}
                      variant={variant}
                      title={t(`${stepKey}.title`)}
                      body={t.rich(`${stepKey}.body`, {
                        em: chunks => <em>{chunks}</em>,
                      })}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
