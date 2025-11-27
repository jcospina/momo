export type SendInvitesState = {
  error?: string;
  success?: string;
};

export type InviteStatus = 'valid' | 'expired' | 'used';

export type InviteInput = {
  name: string;
  email: string;
};

export type InviteDetails = {
  household_id: string;
  household_name: string;
  inviter_name: string | null;
  inviter_email: string | null;
  expires_at: string;
  used_at: string | null;
  status: InviteStatus;
};

export type InviteValidation = {
  invitee_email: string;
  household_id: string;
  status: InviteStatus;
};
