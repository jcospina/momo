'use server';

import { loginWithProvider } from '@actions/login';
import { redirectWithError } from '@utils/redirect-with-error';
import { cookies } from 'next/headers';

export async function startInviteAcceptFlow(token: string) {
  if (typeof token !== 'string' || !token) {
    redirectWithError('/login', 'household_invalid');
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: 'invite_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 3,
  });

  return loginWithProvider('google');
}
