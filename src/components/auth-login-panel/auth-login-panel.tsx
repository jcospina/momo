'use client';

import { AuthLoginForm } from '@components/auth-login-form/auth-login-form';
import { useMediaQuery } from '@hooks/use-media-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/ui/button/button';
import { Typography } from '@/ui/typography/typography';
import styles from './auth-login-panel.module.css';
import { useAuthLoginPanel } from './auth-login-panel-context';

type AuthLoginPanelProps = {
  googleAction: () => Promise<void>;
  signupHref: string;
};

export function AuthLoginPanel({
  googleAction,
  signupHref,
}: AuthLoginPanelProps) {
  const t = useTranslations('auth.login');
  const isWide = useMediaQuery('(min-width: 440px)');
  const { view, setView } = useAuthLoginPanel();

  useEffect(() => {
    if (isWide && view !== 'options') {
      setView('options');
    }
  }, [isWide, view, setView]);

  const signupCta = (
    <Typography size="sm" className={styles['auth-login-panel__signup-cta']}>
      {t.rich('noAccount', {
        link: chunks => (
          <Link
            href={signupHref}
            className={styles['auth-login-panel__signup-link']}
          >
            {chunks}
          </Link>
        ),
      })}
    </Typography>
  );

  const googleForm = (
    <form>
      <Button
        variant="secondary"
        formAction={googleAction}
        className={styles['auth-login-panel__google']}
      >
        {t('signInGoogle')}
      </Button>
    </form>
  );

  if (isWide) {
    return (
      <div className={styles['auth-login-panel']}>
        <AuthLoginForm />
        <div className={styles['auth-login-panel__divider']} aria-hidden="true">
          <span className={styles['auth-login-panel__divider-label']}>
            {t('dividerOr')}
          </span>
        </div>
        {googleForm}
        {signupCta}
      </div>
    );
  }

  const showingForm = view === 'form';

  return (
    <div className={styles['auth-login-panel']}>
      <div
        className={`${styles['auth-login-panel__view']} ${
          showingForm
            ? styles['auth-login-panel__view--form']
            : styles['auth-login-panel__view--options']
        }`}
        key={view}
      >
        {showingForm ? (
          <AuthLoginForm />
        ) : (
          <>
            {googleForm}
            <Button
              variant="primary"
              type="button"
              onClick={() => setView('form')}
              className={styles['auth-login-panel__email']}
            >
              {t('signInEmail')}
            </Button>
          </>
        )}
      </div>
      {signupCta}
    </div>
  );
}
