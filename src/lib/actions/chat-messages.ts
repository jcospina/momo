'use server';

import type { SendChatMessageResult } from '@lib-types/chat-messages';
import { createSupabaseServerClient } from '@lib-supabase/server';

type SendChatMessageInput = {
  content: string;
  householdId?: string | null;
};

export async function sendChatMessage({
  content,
  householdId = null,
}: SendChatMessageInput): Promise<SendChatMessageResult> {
  const trimmed = content?.trim();
  if (!trimmed) {
    return { errorCode: 'message_empty' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errorCode: 'auth_required' };
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      content: trimmed,
      household_id: householdId,
      user_id: user.id,
      sender_name: user.user_metadata?.name ?? user.email ?? null,
    })
    .select(
      'id, household_id, user_id, content, status, expense_id, created_at, sender_name',
    )
    .single();

  if (error || !data) {
    console.error('sendChatMessage failed', error);
    console.error('[chat] send failed', {
      error: error?.message ?? 'unknown',
      household_id: householdId ?? null,
    });
    return { errorCode: 'chat_message_send_failed' };
  }

  return { message: data };
}
