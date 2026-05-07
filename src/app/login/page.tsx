import { Footer } from '@components/landing/footer/footer';
import { LandingNavbar } from '@components/navbar/landing-navbar';
import { Toast } from '@components/toast/toast';
import type { MomoError } from '@lib-types/errors';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { loginWithProvider } from '@/lib/data/auth/server';
import { Button } from '@/ui/button/button';
import { Highlight } from '@/ui/highlight/highlight';
import { Logo } from '@/ui/logo/logo';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import styles from './login.module.css';

type LoginPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function Home({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const tAuth = await getTranslations('auth.login');
  const tErrors = await getTranslations('errors');
  const [taglineLead, ...taglineRest] = tAuth('tagline')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return (
    <div className={styles['login']}>
      <LandingNavbar />
      <main className={styles['login__main']}>
        <div className={styles['login__content']}>
          <Panel padding={5} className={styles['login__panel']}>
            <div className={styles['login__panel-content']}>
              <div className={styles['login__header']}>
                <Typography
                  as="h1"
                  size="xxl"
                  weight="bold"
                  className={styles['login__welcome']}
                >
                  {tAuth('welcome')}
                </Typography>
                <Logo className={styles['login__logo']} />
                <Typography
                  as="p"
                  size="xxl"
                  weight="bold"
                  className={styles['login__tagline']}
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
              <form className={styles['login__actions']}>
                <Button
                  variant="primary"
                  formAction={loginWithProvider.bind(null, 'google')}
                >
                  {tAuth('signInGoogle')}
                </Button>
                <Typography size="sm" className={styles['login__legal-copy']}>
                  {tAuth.rich('legalConsent', {
                    privacy: chunks => (
                      <Link
                        href="/privacy"
                        className={styles['login__legal-link']}
                      >
                        {chunks}
                      </Link>
                    ),
                    terms: chunks => (
                      <Link
                        href="/terms"
                        className={styles['login__legal-link']}
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </Typography>
              </form>
            </div>
          </Panel>
          {error && (
            <Toast variant="error" className={styles['login__toast']}>
              {tErrors(error)}
            </Toast>
          )}
        </div>
      </main>
      <Footer className={styles['login__footer']} />
    </div>
  );
}
