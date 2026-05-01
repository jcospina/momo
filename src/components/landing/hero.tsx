import { Button } from '@ui/button/button';
import { Highlight } from '@ui/highlight/highlight';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import styles from './hero.module.css';
import { HeroChatPreview } from './hero-chat-preview';

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className={styles['momo-landing-hero']}>
      <Typography
        as="h1"
        size="display"
        weight="bold"
        className={styles['momo-landing-hero__title']}
      >
        {t.rich('title', {
          primary: chunks => <Highlight variant="primary">{chunks}</Highlight>,
          feature: chunks => (
            <Highlight variant="feature" rotation="right">
              {chunks}
            </Highlight>
          ),
        })}
      </Typography>
      <HeroChatPreview
        ariaLabel={t('image_alt')}
        className={styles['momo-landing-hero__image']}
      />
      <Typography size="lg" className={styles['momo-landing-hero__sub']}>
        {t.rich('sub', {
          em: chunks => <em>{chunks}</em>,
        })}
      </Typography>
      <div className={styles['momo-landing-hero__cta']}>
        <Button
          variant="primary"
          asLink
          href="/login"
          className={styles['momo-landing-hero__account-cta']}
        >
          {t('cta_primary')}
        </Button>
      </div>
    </section>
  );
}
