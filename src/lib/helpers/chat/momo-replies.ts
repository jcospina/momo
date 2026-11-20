import 'server-only';

import type { ChatMessage, SendMomoMessageResult } from '@lib-types/chat';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CHAT_MESSAGE_SELECT } from '@utils/chat-message';
import { momoIdempotencyKey } from '@utils/momo-mention';

type PersistMomoReplyInput = {
  sessionClient: SupabaseClient;
  serviceClient: SupabaseClient;
  content: string;
  householdId: string | null;
  userId: string;
  triggeringMessageId: string;
};

type TriggeringMessage = {
  id: string;
  user_id: string;
  household_id: string | null;
};

async function fetchTriggeringMessage(
  sessionClient: SupabaseClient,
  triggeringMessageId: string,
): Promise<TriggeringMessage | null> {
  const { data, error } = await sessionClient
    .from('chat_messages')
    .select('id, user_id, household_id')
    .eq('id', triggeringMessageId)
    .maybeSingle();

  if (error) {
    console.error('[chat] momo trigger lookup failed', error);
    return null;
  }

  return (data as TriggeringMessage | null) ?? null;
}

/**
 * Saves MoMo's reply to a user's @momo message.
 *
 * Users cannot write MoMo rows themselves (RLS rejects author_kind = 'momo'),
 * so the reply is inserted with the service role. Before that, the caller's
 * own session must show that the triggering message is theirs and belongs to
 * the same chat (personal or the given household).
 */
export async function persistMomoReply({
  sessionClient,
  serviceClient,
  content,
  householdId,
  userId,
  triggeringMessageId,
}: PersistMomoReplyInput): Promise<SendMomoMessageResult> {
  const trimmed = content?.trim();
  if (!trimmed) {
    return { errorCode: 'message_empty' };
  }

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || user.id !== userId) {
    return { errorCode: 'auth_required' };
  }

  const trigger = await fetchTriggeringMessage(
    sessionClient,
    triggeringMessageId,
  );

  if (
    !trigger ||
    trigger.user_id !== user.id ||
    trigger.household_id !== householdId
  ) {
    console.error('[chat] momo trigger does not belong to the caller', {
      triggeringMessageId,
    });
    return { errorCode: 'momo_message_send_failed' };
  }

  const idempotencyKey = momoIdempotencyKey(trigger.id);

  const { data, error } = await serviceClient
    .from('chat_messages')
    .insert({
      content: trimmed,
      household_id: trigger.household_id,
      user_id: user.id,
      author_kind: 'momo',
      momo_source: 'momo_agent',
      idempotency_key: idempotencyKey,
      status: 'processed',
      sender_name: null,
    })
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error?.code === '23505') {
    // The reply was already saved; read it back with the caller's session.
    const existing = await sessionClient
      .from('chat_messages')
      .select(CHAT_MESSAGE_SELECT)
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing.error || !existing.data) {
      console.error(
        '[chat] momo idempotent read failed',
        existing.error ?? 'no data',
      );
      return { errorCode: 'momo_message_send_failed' };
    }

    return { message: existing.data as unknown as ChatMessage, reused: true };
  }

  if (error || !data) {
    console.error('[chat] send momo message failed', error);
    return { errorCode: 'momo_message_send_failed' };
  }

  return { message: data as unknown as ChatMessage, reused: false };
}
