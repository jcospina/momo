import 'server-only';

import {
  createHousehold as createHouseholdAction,
  createHouseholdInline as createHouseholdInlineAction,
} from '@actions/households';
import {
  fetchHouseholdForUser,
  fetchHouseholdMembers,
  fetchHouseholdMembership,
  getHouseholdForUser as getHouseholdForUserHelper,
  getHouseholdMembershipForUser as getHouseholdMembershipForUserHelper,
} from '@helpers/households';
import { createSupabaseServerClient } from '@lib-supabase/server';

import type {
  Create,
  CreateInline,
  GetHouseholdForUser,
  GetMembers,
  GetMembership,
} from './types';

export const getMembership: GetMembership = async (userId, options) => {
  if (options?.supabase) {
    return fetchHouseholdMembership(options.supabase, userId);
  }

  return getHouseholdMembershipForUserHelper(userId);
};

export const getHouseholdForUser: GetHouseholdForUser = async (
  userId,
  options,
) => {
  if (options?.supabase) {
    return fetchHouseholdForUser(options.supabase, userId);
  }

  return getHouseholdForUserHelper(userId);
};

export const getMembers: GetMembers = async (householdId, options) => {
  const supabase = options?.supabase ?? (await createSupabaseServerClient());

  return fetchHouseholdMembers(supabase, householdId);
};

export const create: Create = async (prevState, formData) => {
  'use server';

  return createHouseholdAction(prevState, formData);
};

export const createInline: CreateInline = async (prevState, formData) => {
  'use server';

  return createHouseholdInlineAction(prevState, formData);
};
