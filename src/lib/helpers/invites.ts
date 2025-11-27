import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import type { InviteDetails, InviteValidation } from '@lib-types/invites';

export async function findUserAndHouseholdByEmail(
  supabase: SupabaseClient,
  email: string,
) {
  const { data: isMember, error: isMemberError } = await supabase.rpc(
    'is_email_in_household',
    { p_email: email },
  );

  if (isMemberError) {
    throw isMemberError;
  }

  return { hasHousehold: Boolean(isMember) };
}

export async function fetchInviteByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<InviteDetails | null> {
  const { data, error } = await supabase.rpc('get_invite_by_token', {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const invite = data[0] as InviteDetails;

  return invite;
}

export async function fetchInviteDetails(
  supabase: SupabaseClient,
  token: string,
): Promise<InviteValidation | null> {
  const { data, error } = await supabase.rpc('get_invite_details', {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as InviteValidation;
}

export function hashInviteToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}
