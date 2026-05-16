import { Footer } from '@components/landing/footer/footer';
import { LandingNavbar } from '@components/navbar/landing-navbar';
import { Toast } from '@components/toast/toast';
import type { MomoError } from '@lib-types/errors';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Highlight } from '@/ui/highlight/highlight';
import { Logo } from '@/ui/logo/logo';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';

import styles from './auth-shell.module.css';

type AuthShellProps = {
  welcome: string;
  tagline: string;
  error?: MomoError;
  children: ReactNode;
};

export async function AuthShell({
  welcome,
  tagline,
  error,
  children,
}: AuthShellProps) {
  const tErrors = await getTranslations('errors');
  const tLogin = await getTranslations('auth.login');
  const [taglineLead, ...taglineRest] = tagline
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  return (
    <div className={styles['auth-shell']}>
      <LandingNavbar />
      <main className={styles['auth-shell__main']}>
        <div className={styles['auth-shell__content']}>
          <Panel padding={5} className={styles['auth-shell__panel']}>
            <div className={styles['auth-shell__panel-content']}>
              <div className={styles['auth-shell__header']}>
                <Typography
                  as="h1"
                  size="xxl"
                  weight="bold"
                  className={styles['auth-shell__welcome']}
                >
                  {welcome}
                </Typography>
                <Logo className={styles['auth-shell__logo']} />
                <Typography
                  as="p"
                  size="xxl"
                  weight="bold"
                  className={styles['auth-shell__tagline']}
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
                      {tagline}
                    </Highlight>
                  )}
                </Typography>
              </div>
              <div className={styles['auth-shell__actions']}>
                {children}
                <Typography
                  size="sm"
                  className={styles['auth-shell__legal-copy']}
                >
                  {tLogin.rich('legalConsent', {
                    privacy: chunks => (
                      <Link
                        href="/privacy"
                        className={styles['auth-shell__legal-link']}
                      >
                        {chunks}
                      </Link>
                    ),
                    terms: chunks => (
                      <Link
                        href="/terms"
                        className={styles['auth-shell__legal-link']}
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
            <Toast variant="error" className={styles['auth-shell__toast']}>
              {tErrors(error)}
            </Toast>
          )}
        </div>
      </main>
      <Footer className={styles['auth-shell__footer']} />
    </div>
  );
}
