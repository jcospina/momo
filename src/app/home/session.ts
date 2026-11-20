import 'server-only';

import type { Profile } from '@lib-types/profile';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/data/auth/server';
import { getProfile } from '@/lib/data/profile/server';

/**
 * The signed-in user's id for a /home page, or a redirect to /login. The
 * proxy has already turned away visitors without a session; this keeps the
 * check the home layout used to make.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }
  return userId;
}

/**
 * The user's profile (the same request-cached read the layout hands to the
 * navbar), or a redirect to /login when it is missing.
 */
export async function requireProfile(userId: string): Promise<Profile> {
  const profile = await getProfile(userId);
  if (!profile) {
    redirect('/login');
  }
  return profile;
}
