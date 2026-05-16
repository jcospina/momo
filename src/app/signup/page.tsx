import { AuthShell } from '@components/auth-shell/auth-shell';
import { AuthSignupForm } from '@components/auth-signup-form/auth-signup-form';
import type { MomoError } from '@lib-types/errors';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LOGIN_PATH } from '@/lib/routes';
import { Typography } from '@/ui/typography/typography';
import styles from './signup.module.css';

type SignupPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function Signup({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;
  const tAuth = await getTranslations('auth.signup');

  return (
    <AuthShell
      welcome={tAuth('welcome')}
      tagline={tAuth('tagline')}
      error={error}
    >
      <AuthSignupForm />
      <Typography size="sm" className={styles['signup__login-cta']}>
        {tAuth.rich('haveAccount', {
          link: chunks => (
            <Link href={LOGIN_PATH} className={styles['signup__login-link']}>
              {chunks}
            </Link>
          ),
        })}
      </Typography>
    </AuthShell>
  );
}
