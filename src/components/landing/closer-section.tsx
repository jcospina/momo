import { Button } from '@ui/button/button';
import { Highlight } from '@ui/highlight/highlight';
import { Logo } from '@ui/logo/logo';
import { Typography } from '@ui/typography/typography';
import { useTranslations } from 'next-intl';
import styles from './closer-section.module.css';

export function CloserSection() {
  const t = useTranslations('landing.closer');

  return (
    <section className={styles['momo-landing-closer']}>
      <div className={styles['momo-landing-closer__lockup']}>
        <Logo />
        <Typography
          as="h2"
          size="display"
          weight="bold"
          className={styles['momo-landing-closer__title']}
        >
          {t.rich('title', {
            br: () => <br />,
            stamp: chunks => (
              <Highlight variant="feature" rotation="right">
                {chunks}
              </Highlight>
            ),
          })}
        </Typography>
      </div>
      <Typography size="lg" className={styles['momo-landing-closer__sub']}>
        {t('sub')}
      </Typography>
      <Button variant="primary" asLink href="/login">
        {t('cta')}
      </Button>
    </section>
  );
}
