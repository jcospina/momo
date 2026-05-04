'use client';

import { useGSAP } from '@gsap/react';
import { useMediaQuery } from '@hooks/use-media-query';
import { useScrollProgress, useScrollTick } from '@hooks/use-scroll-progress';
import { Highlight } from '@ui/highlight/highlight';
import { ChartIcon } from '@ui/icons/chart';
import { GroupIcon } from '@ui/icons/group';
import { MessageIcon } from '@ui/icons/message';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { FeatureCard } from './feature-card';
import sectionStyles from './features-section.module.css';
import styles from './landing.module.css';

gsap.registerPlugin(useGSAP);

const TITLE_DURATION = 0.4;
const CARD_DURATION = 0.6;
const CARDS_START = 2;

export function FeaturesSection() {
  const t = useTranslations('landing.features');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const sectionRef = useRef<HTMLElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const getProgress = useScrollProgress(sectionRef, {
    start: 'top-bottom',
    end: 'bottom-bottom',
  });

  useGSAP(
    () => {
      if (reducedMotion) return;
      const head = headRef.current;
      const cards = cardsRef.current?.children;
      if (!head || !cards || cards.length === 0) return;

      const tl = gsap.timeline({ paused: true });
      gsap.set(head, { opacity: 0, y: 40 });
      gsap.set(cards, { opacity: 0, y: 32, scale: 0.85 });
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
      for (let i = 0; i < cards.length; i++) {
        tl.to(
          cards[i],
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: CARD_DURATION,
            ease: 'back.out(2.4)',
          },
          CARDS_START + i * CARD_DURATION,
        );
      }
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
      id="features"
      className={cn(
        styles['momo-landing__section'],
        sectionStyles['momo-landing-features-section'],
        reducedMotion && sectionStyles['momo-landing-features-section--static'],
      )}
    >
      <div className={sectionStyles['momo-landing-features-section__sticky']}>
        <div
          ref={headRef}
          className={sectionStyles['momo-landing-section-head']}
        >
          <Typography
            as="h2"
            size="xxl"
            weight="bold"
            className={styles['momo-landing-section-head__title']}
          >
            {t.rich('heading', {
              feature: chunks => (
                <Highlight variant="warm" rotation="left">
                  {chunks}
                </Highlight>
              ),
            })}
          </Typography>
        </div>
        <div ref={cardsRef} className={sectionStyles['momo-landing-features']}>
          <FeatureCard
            iconVariant="primary"
            icon={<MessageIcon width={30} height={30} />}
            title={t('cards.chat.title')}
            body={t('cards.chat.body')}
          />
          <FeatureCard
            iconVariant="feature"
            icon={<GroupIcon width={30} height={30} />}
            title={t('cards.scope.title')}
            body={t('cards.scope.body')}
          />
          <FeatureCard
            iconVariant="info"
            icon={<ChartIcon width={30} height={30} />}
            title={t('cards.stats.title')}
            body={t('cards.stats.body')}
          />
        </div>
      </div>
    </section>
  );
}
