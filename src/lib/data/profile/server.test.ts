import type { AuthUser } from '@supabase/supabase-js';

import {
  createUserProfile as createUserProfileHelper,
  getUserProfile as getUserProfileHelper,
} from '@helpers/profiles';

import { createProfile, getProfile } from './server';

jest.mock('@helpers/profiles', () => ({
  createUserProfile: jest.fn(),
  getUserProfile: jest.fn(),
}));

describe('data/profile/server facade', () => {
  const getUserProfileMock = jest.mocked(getUserProfileHelper);
  const createUserProfileMock = jest.mocked(createUserProfileHelper);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates profile reads to helper', async () => {
    const profile = { user_id: 'user-1' };
    getUserProfileMock.mockResolvedValue(
      profile as Awaited<ReturnType<typeof getUserProfileHelper>>,
    );

    const result = await getProfile('user-1');

    expect(getUserProfileMock).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(profile);
  });

  it('delegates profile creation to helper', async () => {
    const user = { id: 'user-1' } as AuthUser;
    createUserProfileMock.mockResolvedValue(null);

    const result = await createProfile(user);

    expect(createUserProfileMock).toHaveBeenCalledWith(user);
    expect(result).toBeNull();
  });
});
