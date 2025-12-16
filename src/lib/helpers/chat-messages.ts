import type { ChatMessage } from '@lib-types/chat-messages';
import type { SupabaseClient } from '@supabase/supabase-js';

type FetchChatMessagesParams = {
  supabase: SupabaseClient;
  householdId?: string | null;
  userId: string;
  limit?: number;
  before?: string; // ISO timestamp cursor for pagination (fetch older)
};

export async function fetchChatMessages({
  supabase,
  householdId = null,
  userId,
  limit = 30,
  before,
}: FetchChatMessagesParams): Promise<ChatMessage[]> {
  let query = supabase
    .from('chat_messages')
    .select(
      'id, household_id, user_id, content, status, expense_id, created_at, sender_name',
    )
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
