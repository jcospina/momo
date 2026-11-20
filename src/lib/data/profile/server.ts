import 'server-only';

import {
  createUserProfile as createUserProfileHelper,
  getUserProfile as getUserProfileHelper,
} from '@helpers/profiles';

import { cache } from 'react';

import type { CreateProfile, GetProfile } from './types';

// Cached per request: the home layout and its pages read the same profile.
export const getProfile: GetProfile = cache(async userId =>
  getUserProfileHelper(userId),
);

export const createProfile: CreateProfile = async user =>
  createUserProfileHelper(user);
