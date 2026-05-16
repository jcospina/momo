import { AuthSignupForm } from '@components/auth-signup-form/auth-signup-form';
import { Footer } from '@components/landing/footer/footer';
import { LandingNavbar } from '@components/navbar/landing-navbar';
import { Toast } from '@components/toast/toast';
import type { MomoError } from '@lib-types/errors';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Highlight } from '@/ui/highlight/highlight';
import { Logo } from '@/ui/logo/logo';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import styles from './signup.module.css';

type SignupPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function Signup({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;
  const tAuth = await getTranslations('auth.signup');
  const tLogin = await getTranslations('auth.login');
  const tErrors = await getTranslations('errors');
  const [taglineLead, ...taglineRest] = tAuth('tagline')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return (
    <div className={styles['signup']}>
      <LandingNavbar />
      <main className={styles['signup__main']}>
        <div className={styles['signup__content']}>
          <Panel padding={5} className={styles['signup__panel']}>
            <div className={styles['signup__panel-content']}>
              <div className={styles['signup__header']}>
                <Typography
                  as="h1"
                  size="xxl"
                  weight="bold"
                  className={styles['signup__welcome']}
                >
                  {tAuth('welcome')}
                </Typography>
                <Logo className={styles['signup__logo']} />
                <Typography
                  as="p"
                  size="xxl"
                  weight="bold"
                  className={styles['signup__tagline']}
                >
                  {taglineLead ? (
                    <>
                      <Highlight variant="primary">{taglineLead}</Highlight>
                      {taglineRest.map((part, index) => (
                        <Highlight
                          key={`${part}-${index}`}
                          variant={index % 2 === 0 ? 'feature' : 'warm'}
                          rotation={index % 2 === 0 ? 'right' : 'left'}
                        >
                          {part}
                        </Highlight>
                      ))}
                    </>
                  ) : (
                    <Highlight variant="primary" rotation="right">
                      {tAuth('tagline')}
                    </Highlight>
                  )}
                </Typography>
              </div>
              <div className={styles['signup__actions']}>
                <AuthSignupForm className={styles['signup__form']} />
                <Typography size="sm" className={styles['signup__login-cta']}>
                  {tAuth.rich('haveAccount', {
                    link: chunks => (
                      <Link
                        href="/login"
                        className={styles['signup__login-link']}
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </Typography>
                <Typography size="sm" className={styles['signup__legal-copy']}>
                  {tLogin.rich('legalConsent', {
                    privacy: chunks => (
                      <Link
                        href="/privacy"
                        className={styles['signup__legal-link']}
                      >
                        {chunks}
                      </Link>
                    ),
                    terms: chunks => (
                      <Link
                        href="/terms"
                        className={styles['signup__legal-link']}
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </Typography>
              </div>
            </div>
          </Panel>
          {error && (
            <Toast variant="error" className={styles['signup__toast']}>
              {tErrors(error)}
            </Toast>
          )}
        </div>
      </main>
      <Footer className={styles['signup__footer']} />
    </div>
  );
}
