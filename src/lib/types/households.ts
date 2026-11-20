import type { HouseholdError } from '@lib-types/errors';

export type HouseholdMembership = {
  household_id: string;
};

export type Household = {
  id: string;
  name: string;
  owner: string;
};

export type HouseholdMemberProfile = {
  role: string;
  display_name: string | null;
  email: string | null;
};

export type CreateHouseholdState = {
  errorCode?: string;
  error?: string;
};

export type JoinHouseholdResult = {
  joined: boolean;
  errorCode?: HouseholdError;
};
