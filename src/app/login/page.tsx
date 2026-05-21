import { AuthLoginPanel } from '@components/auth-login-panel/auth-login-panel';
import {
  AuthLoginBackButton,
  AuthLoginPanelProvider,
} from '@components/auth-login-panel/auth-login-panel-context';
import { AuthShell } from '@components/auth-shell/auth-shell';
import type { MomoError } from '@lib-types/errors';
import { getTranslations } from 'next-intl/server';
import { loginWithProvider } from '@/lib/data/auth/server';
import { SIGNUP_PATH } from '@/lib/routes';

type LoginPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function Home({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const tAuth = await getTranslations('auth.login');

  return (
    <AuthLoginPanelProvider>
      <AuthShell
        welcome={tAuth('welcome')}
        tagline={tAuth('tagline')}
        error={error}
        headerStart={<AuthLoginBackButton />}
      >
        <AuthLoginPanel
          googleAction={loginWithProvider.bind(null, 'google')}
          signupHref={SIGNUP_PATH}
        />
      </AuthShell>
    </AuthLoginPanelProvider>
  );
}
