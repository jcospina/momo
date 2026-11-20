import type { OnboardingStatus } from '@lib-types/user-preferences';

/**
 * Remembers that a user has finished (completed or skipped) onboarding, so
 * the proxy can let them into /home without asking the database every time.
 *
 * Safe to cache because the status only moves forward: the app writes
 * 'completed' or 'skipped', never 'unknown' again, and the /home guard only
 * acts on 'unknown'. The value is bound to the user id from the verified
 * token, so another account on the same browser never reuses it. It carries
 * no privilege: forging it only skips your own onboarding redirect.
 */
export const ONBOARDED_COOKIE = 'momo-onboarded';

export type FinishedOnboardingStatus = Exclude<OnboardingStatus, 'unknown'>;

// Browsers cap cookie lifetimes at 400 days.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function onboardedCookieValue(
  userId: string,
  status: FinishedOnboardingStatus,
) {
  return `${userId}.${status}`;
}

/** The remembered status for this user, or null when none is stored. */
export function readOnboardedCookie(
  value: string | undefined,
  userId: string,
): FinishedOnboardingStatus | null {
  if (!value) {
    return null;
  }
  const separator = value.lastIndexOf('.');
  const cookieUserId = value.slice(0, separator);
  const status = value.slice(separator + 1);
  if (separator < 0 || cookieUserId !== userId) {
    return null;
  }
  return status === 'completed' || status === 'skipped' ? status : null;
}

export const ONBOARDED_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
} as const;
