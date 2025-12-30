import type { ChatMessage } from '@lib-types/chat';
import type { SupabaseClient } from '@supabase/supabase-js';

type FetchChatMessagesParams = {
  supabase: SupabaseClient;
  householdId?: string | null;
  userId: string;
  limit?: number;
  before?: string; // ISO timestamp cursor for pagination (fetch older)
};

type ChatHistoryCursor = {
  created_at: string;
  id: string;
};

type FetchChatHistoryParams = {
  supabase: SupabaseClient;
  householdId?: string | null;
  userId: string;
  limit?: number;
  before?: ChatHistoryCursor | null;
};

type DeleteChatMessageParams = {
  supabase: SupabaseClient;
  messageId: string;
  userId: string;
};

type DeleteChatMessageResult = {
  deletedId: string | null;
  error: string | null;
};

const CHAT_MESSAGE_SELECT =
  'id, household_id, user_id, content, status, expense_count, created_at, sender_name';

export async function fetchChatMessages({
  supabase,
  householdId = null,
  userId,
  limit = 30,
  before,
}: FetchChatMessagesParams): Promise<ChatMessage[]> {
  let query = supabase
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  if (householdId) {
    query = query.eq('household_id', householdId);
  } else {
    query = query.is('household_id', null).eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchChatMessages failed', error);
    return [];
  }

  return (data as ChatMessage[]) ?? [];
}

export async function fetchChatHistory({
  supabase,
  householdId = null,
  userId,
  limit = 30,
  before,
}: FetchChatHistoryParams): Promise<ChatMessage[]> {
  let query = supabase
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (householdId) {
    query = query.eq('household_id', householdId);
  } else {
    query = query.is('household_id', null).eq('user_id', userId);
  }

  if (before?.created_at && before?.id) {
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchChatHistory failed', error);
    return [];
  }

  return (data as ChatMessage[] | null)?.reverse() ?? [];
}

export async function deleteChatMessage({
  supabase,
  messageId,
  userId,
}: DeleteChatMessageParams): Promise<DeleteChatMessageResult> {
  const { data, error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    console.error('deleteChatMessage failed', error);
    return { deletedId: null, error: error.message };
  }

  const deletedId = data?.[0]?.id ?? null;
  return { deletedId, error: null };
}
