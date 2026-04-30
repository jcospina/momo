import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import type { ReactNode } from 'react';
import styles from './landing.module.css';

type FeatureCardProps = {
  icon: ReactNode;
  iconVariant: 'primary' | 'feature' | 'info';
  title: string;
  body: string;
};

export function FeatureCard({
  icon,
  iconVariant,
  title,
  body,
}: FeatureCardProps) {
  return (
    <article className={styles['momo-landing-feature-card']}>
      <div
        className={cn(
          styles['momo-landing-feature-card__icon'],
          styles[`momo-landing-feature-card__icon--${iconVariant}`],
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <Typography
        as="h3"
        size="xl"
        weight="bold"
        className={styles['momo-landing-feature-card__title']}
      >
        {title}
      </Typography>
      <Typography className={styles['momo-landing-feature-card__body']}>
        {body}
      </Typography>
    </article>
  );
}
