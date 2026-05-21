'use server';

import { createSupabaseServerClient } from '@lib-supabase/server';
import { HOME_PATH, LOGIN_PATH, ONBOARDING_PATH } from '@proxy/constants';
import type { Provider, SupabaseClient, User } from '@supabase/supabase-js';
import { redirectWithError } from '@utils/redirect-with-error';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type {
  LoginWithPasswordState,
  SignupWithPasswordState,
} from '@/lib/data/auth/types';
import { getMembership } from '@/lib/data/households/server';
import { createProfile } from '@/lib/data/profile/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function loginWithProvider(provider: Provider): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error('Provider login failed', error);
    return redirectWithError(LOGIN_PATH, 'auth_provider_failed');
  }

  if (!data.url) {
    redirectWithError(LOGIN_PATH, 'auth_provider_failed');
  }
  redirect(data.url);
}

export async function loginWithPassword(
  _prevState: LoginWithPasswordState,
  formData: FormData,
): Promise<LoginWithPasswordState> {
  const tErrors = await getTranslations('errors');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!EMAIL_PATTERN.test(email)) {
    return { error: tErrors('auth_email_invalid') };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: tErrors('auth_password_too_short') };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: tErrors('auth_invalid_credentials') };
  }

  return redirectAfterAuth(supabase, data.user);
}

export async function signupWithPassword(
  _prevState: SignupWithPasswordState,
  formData: FormData,
): Promise<SignupWithPasswordState> {
  const tErrors = await getTranslations('errors');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!EMAIL_PATTERN.test(email)) {
    return { error: tErrors('auth_email_invalid') };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: tErrors('auth_password_too_short') };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      return { error: tErrors('auth_email_in_use') };
    }
    console.error('Signup failed', error);
    return { error: tErrors('auth_signup_failed') };
  }

  if (!data.user) {
    return { error: tErrors('auth_signup_failed') };
  }

  return redirectAfterAuth(supabase, data.user);
}

export async function loginAsDemo(): Promise<void> {
  const email = process.env.MOMO_DEMO_EMAIL;
  const password = process.env.MOMO_DEMO_PASSWORD;

  if (!email || !password) {
    console.error('Demo login attempted without MOMO_DEMO_EMAIL/PASSWORD set');
    redirectWithError(LOGIN_PATH, 'auth_demo_not_configured');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error('Demo login failed', error);
    redirectWithError(LOGIN_PATH, 'auth_invalid_credentials');
  }

  return redirectAfterAuth(supabase, data.user);
}

async function redirectAfterAuth(
  supabase: SupabaseClient,
  user: User,
): Promise<never> {
  const [profileError, membership] = await Promise.all([
    createProfile(user),
    getMembership(user.id, { supabase }),
  ]);

  if (profileError) {
    redirectWithError(LOGIN_PATH, 'profile_create_failed');
  }

  redirect(membership ? HOME_PATH : ONBOARDING_PATH);
}
