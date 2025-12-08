'use server';

import { cookies } from 'next/headers';

import { loginWithProvider } from '@actions/login';

export async function startInviteAcceptFlow(formData: FormData) {
  const token = formData.get('token');
  if (typeof token !== 'string' || !token) {
    throw new Error('Missing invite token');
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
