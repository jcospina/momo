'use server';

import { createSupabaseServerClient } from '@lib-supabase/server';
import type { MomoError } from '@lib-types/errors';
import type {
  SupportedCurrency,
  SupportedLanguage,
} from '@lib-types/user-preferences';
import { OnboardingStatus } from '@lib-types/user-preferences';
import { redirectWithError } from '@utils/redirect-with-error';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function setOnboardingStatus(
  status: OnboardingStatus,
): Promise<void> {
  console.log('setOnboardingStatus called with', status);
  if (status !== 'skipped' && status !== 'completed') {
    throw new Error('Invalid onboarding status');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { error } = await supabase
    .from('user_prefs')
    .upsert(
      { user_id: user.id, onboarding_status: status },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('setOnboardingStatus failed', error);
    throw new Error(error.message);
  }

  redirect('/home');
}

export type UpdatePrefResult = {
  errorCode?: MomoError;
};

export async function setCurrency(
  currency: SupportedCurrency,
): Promise<UpdatePrefResult | void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithError('/login', 'auth_required');
  }

  const { error } = await supabase
    .from('user_prefs')
    .upsert({ user_id: user.id, currency }, { onConflict: 'user_id' });

  if (error) {
    return {
      errorCode: 'user_pref_update_failed',
    };
  }

  return {};
}

export async function setAiEnabled(
  next: boolean,
): Promise<UpdatePrefResult | void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithError('/login', 'auth_required');
  }

  const { error } = await supabase
    .from('user_prefs')
    .upsert({ user_id: user.id, ai_enabled: next }, { onConflict: 'user_id' });

  if (error) {
    return {
      errorCode: 'user_pref_update_failed',
    };
  }

  return {};
}

export async function setLanguage(
  language: SupportedLanguage,
): Promise<UpdatePrefResult | void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithError('/login', 'auth_required');
  }

  const { error } = await supabase
    .from('user_prefs')
    .upsert({ user_id: user.id, language }, { onConflict: 'user_id' });

  if (error) {
    return {
      errorCode: 'user_pref_update_failed',
    };
  }

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', language, { path: '/', sameSite: 'lax' });

  return {};
}
