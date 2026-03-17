import 'server-only';

import {
  createUserProfile as createUserProfileHelper,
  getUserProfile as getUserProfileHelper,
} from '@helpers/profiles';

import type { CreateProfile, GetProfile } from './types';

export const getProfile: GetProfile = async userId =>
  getUserProfileHelper(userId);

export const createProfile: CreateProfile = async user =>
  createUserProfileHelper(user);
