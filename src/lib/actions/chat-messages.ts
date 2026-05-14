'use server';

import { deleteChatMessage as deleteChatMessageRow } from '@helpers/chat/chat-messages';
import { processChatMessage } from '@helpers/chat/chat-processor';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type {
  ChatMessage,
  DeleteChatMessageResult,
  SendChatMessageResult,
  SendMomoMessageResult,
} from '@lib-types/chat';
import { CHAT_MESSAGE_SELECT } from '@utils/chat-message';
import { parseMomoMention } from '@utils/momo-mention';

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

  const { tagged } = parseMomoMention(trimmed);

  const insertPayload = {
    content: trimmed,
    household_id: householdId,
    user_id: user.id,
    sender_name: user.user_metadata?.name ?? user.email ?? null,
    ...(tagged ? { momo_invocation_tagged: true, status: 'processed' } : {}),
  };

  const { data: rawData, error } = await supabase
    .from('chat_messages')
    .insert(insertPayload)
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error || !rawData) {
    console.error('sendChatMessage failed', error);
    console.error('[chat] send failed', {
      error: error?.message ?? 'unknown',
      household_id: householdId ?? null,
    });
    return { errorCode: 'chat_message_send_failed' };
  }

  const data = rawData as unknown as ChatMessage;

  // Tagged user messages bypass the expense pipeline — they're routed to the
  // momo agent by a downstream handler, not extracted for expenses.
  if (tagged) {
    return { message: data };
  }

  try {
    await processChatMessage(data);
  } catch (err) {
    console.error('[chat] processing failed', err);
    await supabase
      .from('chat_messages')
      .update({ status: 'failed' })
      .eq('id', data.id);
  }

  const { data: updatedRaw, error: updatedError } = await supabase
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .eq('id', data.id)
    .single();

  if (updatedError || !updatedRaw) {
    console.warn('[chat] message fetch after processing failed', {
      error: updatedError?.message ?? 'unknown',
      id: data.id,
    });
    return { message: data };
  }

  return { message: updatedRaw as unknown as ChatMessage };
}

type DeleteChatMessageInput = {
  messageId: string;
};

export async function deleteChatMessage({
  messageId,
}: DeleteChatMessageInput): Promise<DeleteChatMessageResult> {
  const trimmed = messageId?.trim();
  if (!trimmed) {
    return { errorCode: 'chat_message_not_found' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errorCode: 'auth_required' };
  }

  const { deletedId, error } = await deleteChatMessageRow({
    supabase,
    messageId: trimmed,
    userId: user.id,
  });

  if (error) {
    return { errorCode: 'chat_message_delete_failed' };
  }

  if (!deletedId) {
    return { errorCode: 'chat_message_not_found' };
  }

  return { messageId: deletedId };
}

type SendMomoMessageInput = {
  content: string;
  householdId: string | null;
  userId: string;
  triggeringMessageId: string;
};

export async function sendMomoMessage({
  content,
  householdId,
  userId,
  triggeringMessageId,
}: SendMomoMessageInput): Promise<SendMomoMessageResult> {
  const trimmed = content?.trim();
  if (!trimmed) {
    return { errorCode: 'message_empty' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { errorCode: 'auth_required' };
  }

  const idempotencyKey = `momo:${triggeringMessageId}`;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      content: trimmed,
      household_id: householdId,
      user_id: userId,
      author_kind: 'momo',
      momo_source: 'momo_agent',
      idempotency_key: idempotencyKey,
      status: 'processed',
      sender_name: null,
    })
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error?.code === '23505') {
    const existing = await supabase
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
