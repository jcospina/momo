import { Button } from '@ui/button/button';
import { Highlight } from '@ui/highlight/highlight';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import styles from './hero.module.css';
import { ImagePlaceholder } from './image-placeholder';

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className={styles['momo-landing-hero']}>
      <div>
        <Typography
          as="h1"
          size="display"
          weight="bold"
          className={styles['momo-landing-hero__title']}
        >
          {t.rich('title', {
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
        <Typography size="lg" className={styles['momo-landing-hero__sub']}>
          {t.rich('sub', {
            em: chunks => <em>{chunks}</em>,
          })}
        </Typography>
        <div className={styles['momo-landing-hero__cta']}>
          <Button variant="primary" asLink href="/login">
            {t('cta_primary')}
          </Button>
          <Button variant="surface" asLink href="#how">
            {t('cta_secondary')}
          </Button>
        </div>
      </div>
      <ImagePlaceholder variant="hero" ariaLabel={t('image_alt')} />
    </section>
  );
}
