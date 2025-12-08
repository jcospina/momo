export type InviteStatus =
  | 'valid'
  | 'household_full'
  | 'no_household'
  | 'invalid';
export type InviteInfo = {
  household_id: string | null;
  household_name: string | null;
  inviter_name: string | null;
  member_count: number | null;
  status: InviteStatus;
};
