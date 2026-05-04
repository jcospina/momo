'use client';

import { Highlight } from '@ui/highlight/highlight';
import { ChartIcon } from '@ui/icons/chart';
import { GroupIcon } from '@ui/icons/group';
import { MessageIcon } from '@ui/icons/message';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { useTranslations } from 'next-intl';
import { FeatureCard } from './feature-card';
import sectionStyles from './features-section.module.css';
import styles from './landing.module.css';

export function FeaturesSection() {
  const t = useTranslations('landing.features');

  return (
    <section
      className={cn(
        styles['momo-landing__section'],
        sectionStyles['momo-landing-features-section'],
      )}
    >
      <div id="features" className={sectionStyles['momo-landing-section-head']}>
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
      <div className={sectionStyles['momo-landing-features']}>
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
    </section>
  );
}
