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
  error?: string;
};
