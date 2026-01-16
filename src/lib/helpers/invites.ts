import { InviteInfo, InviteStatus } from '@lib-types/invites';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchInviteInfo(
  supabase: SupabaseClient,
  token: string,
): Promise<InviteInfo | null> {
  const { data, error } = await supabase.rpc('get_share_link_info', {
    p_token: token,
  });

  if (error || !data || data.length === 0) {
    console.error('get_share_link_info failed', error);
    return null;
  }

  const row = data[0] as InviteInfo;

  const status = (row.status as InviteStatus) ?? 'household_invalid';

  return {
    household_id: (row.household_id as string | null) ?? null,
    household_name: (row.household_name as string | null) ?? null,
    inviter_name: row.inviter_name as string | null,
    member_count: (row.member_count as number | null) ?? null,
    status,
  };
}
