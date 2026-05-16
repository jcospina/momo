import { AuthLoginForm } from '@components/auth-login-form/auth-login-form';
import { AuthShell } from '@components/auth-shell/auth-shell';
import type { MomoError } from '@lib-types/errors';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { loginWithProvider } from '@/lib/data/auth/server';
import { SIGNUP_PATH } from '@/lib/routes';
import { Button } from '@/ui/button/button';
import { Typography } from '@/ui/typography/typography';
import styles from './login.module.css';

type LoginPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function Home({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const tAuth = await getTranslations('auth.login');

  return (
    <AuthShell
      welcome={tAuth('welcome')}
      tagline={tAuth('tagline')}
      error={error}
    >
      <AuthLoginForm />
      <div className={styles['login__divider']} aria-hidden="true">
        <span className={styles['login__divider-label']}>
          {tAuth('dividerOr')}
        </span>
      </div>
      <form>
        <Button
          variant="secondary"
          formAction={loginWithProvider.bind(null, 'google')}
          className={styles['login__provider-button']}
        >
          {tAuth('signInGoogle')}
        </Button>
      </form>
      <Typography size="sm" className={styles['login__signup-cta']}>
        {tAuth.rich('noAccount', {
          link: chunks => (
            <Link href={SIGNUP_PATH} className={styles['login__signup-link']}>
              {chunks}
            </Link>
          ),
        })}
      </Typography>
    </AuthShell>
  );
}
