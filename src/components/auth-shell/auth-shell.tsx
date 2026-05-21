import { Footer } from '@components/landing/footer/footer';
import { LandingNavbar } from '@components/navbar/landing-navbar';
import { Toast } from '@components/toast/toast';
import type { MomoError } from '@lib-types/errors';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Flex } from '@/ui/flex/flex';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import styles from './auth-shell.module.css';
import { AuthShellHeader } from './auth-shell-header';

type AuthShellProps = {
  welcome: string;
  tagline: string;
  error?: MomoError;
  headerStart?: ReactNode;
  children: ReactNode;
};

export async function AuthShell({
  welcome,
  tagline,
  error,
  headerStart,
  children,
}: AuthShellProps) {
  const tErrors = await getTranslations('errors');
  const tLogin = await getTranslations('auth.login');

  return (
    <div className={styles['auth-shell']}>
      <LandingNavbar />
      <main className={styles['auth-shell__main']}>
        <Flex
          as="div"
          direction="column"
          alignItems="center"
          justifyContent="center"
          gap={3}
          isFullHeight
          isFullWidth
        >
          <Panel padding={5} className={styles['auth-shell__panel']}>
            {headerStart ? (
              <div className={styles['auth-shell__panel-start']}>
                {headerStart}
              </div>
            ) : null}
            <Flex
              direction="column"
              alignItems="center"
              className={styles['auth-shell__panel-content']}
              isFullWidth
            >
              <AuthShellHeader welcome={welcome} tagline={tagline} />
              <Flex
                direction="column"
                alignItems="stretch"
                gap={2}
                className={styles['auth-shell__actions']}
                isFullWidth
              >
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
              </Flex>
            </Flex>
          </Panel>
          {error && (
            <Toast variant="error" className={styles['auth-shell__toast']}>
              {tErrors(error)}
            </Toast>
          )}
        </Flex>
      </main>
      <Footer className={styles['auth-shell__footer']} />
    </div>
  );
}
