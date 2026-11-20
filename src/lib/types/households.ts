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
  /** Present once the member colour slots migration is applied. */
  user_id?: string;
  /** Fixed colour slot (1–5) the member keeps while in the household. */
  color_slot?: number | null;
};

export type CreateHouseholdState = {
  errorCode?: string;
  error?: string;
};

export type JoinHouseholdResult = {
  joined: boolean;
  errorCode?: HouseholdError;
};
