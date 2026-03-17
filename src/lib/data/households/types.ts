import type {
  CreateHouseholdState,
  Household,
  HouseholdMemberProfile,
  HouseholdMembership,
} from '@lib-types/households';
import type { SupabaseClient } from '@supabase/supabase-js';

export type HouseholdQueryOptions = {
  supabase?: SupabaseClient;
};

export type GetMembership = (
  userId: string,
  options?: HouseholdQueryOptions,
) => Promise<HouseholdMembership | null>;

export type GetHouseholdForUser = (
  userId: string,
  options?: HouseholdQueryOptions,
) => Promise<Household | null>;

export type GetMembers = (
  householdId: string,
  options?: HouseholdQueryOptions,
) => Promise<HouseholdMemberProfile[]>;

export type Create = (
  _prevState: CreateHouseholdState,
  formData: FormData,
) => Promise<CreateHouseholdState>;

export type CreateInline = (
  _prevState: CreateHouseholdState,
  formData: FormData,
) => Promise<CreateHouseholdState>;
