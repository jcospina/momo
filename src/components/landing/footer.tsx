import { GithubIcon } from '@ui/icons/github';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './footer.module.css';

export function Footer() {
  const t = useTranslations('landing.footer');

  return (
    <footer className={styles['momo-landing-footer']}>
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
