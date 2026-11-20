import { getCurrentUserId } from '@/lib/data/auth/server';
import { getProfile } from '@/lib/data/profile/server';
import { requireProfile, requireUserId } from './session';

const redirectSpy = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectSpy(path);
    throw new Error('NEXT_REDIRECT');
  },
}));

jest.mock('@/lib/data/auth/server', () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock('@/lib/data/profile/server', () => ({
  getProfile: jest.fn(),
}));

describe('/home session helpers', () => {
  const getCurrentUserIdMock = jest.mocked(getCurrentUserId);
  const getProfileMock = jest.mocked(getProfile);

  it('returns the signed-in user id', async () => {
    getCurrentUserIdMock.mockResolvedValue('user-1');

    await expect(requireUserId()).resolves.toBe('user-1');
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('sends visitors without a session to /login', async () => {
    getCurrentUserIdMock.mockResolvedValue(null);

    await expect(requireUserId()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectSpy).toHaveBeenCalledWith('/login');
  });

  it('returns the profile, or sends users without one to /login', async () => {
    const profile = { user_id: 'user-1' } as Awaited<
      ReturnType<typeof getProfile>
    >;
    getProfileMock.mockResolvedValueOnce(profile).mockResolvedValueOnce(null);

    await expect(requireProfile('user-1')).resolves.toBe(profile);
    await expect(requireProfile('user-1')).rejects.toThrow('NEXT_REDIRECT');
    expect(getProfileMock).toHaveBeenCalledWith('user-1');
    expect(redirectSpy).toHaveBeenCalledWith('/login');
  });
});
