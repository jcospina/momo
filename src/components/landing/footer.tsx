import type { PropsWithClassName } from '@lib-types/common';
import { GithubIcon } from '@ui/icons/github';
import { cn } from '@utils/cn';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './footer.module.css';

export function Footer({ className }: PropsWithClassName) {
  const t = useTranslations('landing.footer');

  return (
    <footer className={cn(styles['momo-landing-footer'], className)}>
      <div className={styles['momo-landing-footer__links']}>
        <Link href="/privacy" className={styles['momo-landing-footer__link']}>
          {t('privacy')}
        </Link>
        <Link href="/terms" className={styles['momo-landing-footer__link']}>
          {t('terms')}
        </Link>
        <a
          href="https://github.com/jcospina/momo"
          className={styles['momo-landing-footer__link']}
          target="_blank"
          rel="noreferrer"
        >
          <GithubIcon width={18} height={18} aria-hidden="true" />
          {t('github')}
        </a>
      </div>
    </footer>
  );
}
