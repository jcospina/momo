import { onboardedCookieValue, readOnboardedCookie } from './onboarded-cookie';

describe('onboarded cookie', () => {
  it('round-trips a finished status for the same user', () => {
    const value = onboardedCookieValue('user-1', 'skipped');

    expect(readOnboardedCookie(value, 'user-1')).toBe('skipped');
  });

  it('ignores a value written for another user', () => {
    const value = onboardedCookieValue('user-1', 'completed');

    expect(readOnboardedCookie(value, 'user-2')).toBeNull();
  });

  it('ignores missing, malformed and unknown values', () => {
    expect(readOnboardedCookie(undefined, 'user-1')).toBeNull();
    expect(readOnboardedCookie('user-1', 'user-1')).toBeNull();
    expect(readOnboardedCookie('user-1.unknown', 'user-1')).toBeNull();
    expect(readOnboardedCookie('user-1.admin', 'user-1')).toBeNull();
  });
});
