'use client';

import { Highlight } from '@ui/highlight/highlight';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import howStyles from './how-it-works.module.css';
import styles from './landing.module.css';

const STEP_VARIANTS = ['primary', 'feature', 'info'] as const;

function Step({
  number,
  variant,
  title,
  body,
}: {
  number: number;
  variant: (typeof STEP_VARIANTS)[number];
  title: string;
  body: ReactNode;
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

  return (
    <section
      className={cn(
        styles['momo-landing__section'],
        howStyles['momo-landing-how-section'],
      )}
    >
      <div id="how" className={howStyles['momo-landing-how__heading']}>
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
      <div className={howStyles['momo-landing-how']}>
        <div className={howStyles['momo-landing-how__grid']}>
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
    </section>
  );
}
