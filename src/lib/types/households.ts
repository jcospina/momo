export type HouseholdMembership = {
  household_id: string;
};

export type Household = {
  id: string;
  name: string;
  owner: string;
};

export type CreateHouseholdState = {
  error?: string;
};
