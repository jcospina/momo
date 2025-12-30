import type { ChatMessage } from '@lib-types/chat';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ChatRealtimeHandler = (payload: {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  message: ChatMessage;
}) => void;

/**
 * Create a realtime channel for household chat messages, filtered by household_id.
 * Requires an authenticated supabase client (with user access token) to satisfy RLS.
 */
export function subscribeToHouseholdChat(
  householdId: string,
  client: SupabaseClient,
  onChange: ChatRealtimeHandler,
  onStatus?: (status: string) => void,
) {
  const topic = `chat:household:${householdId}`;
  let lastStatus: string | null = null;

  const channel = client
    .channel(topic)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        filter: `household_id=eq.${householdId}`,
        table: 'chat_messages',
      },
      payload => {
        const type = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const record =
          type === 'DELETE'
            ? (payload.old as ChatMessage | null)
            : (payload.new as ChatMessage | null);
        if (!record) return;
        onChange({ type, message: record });
      },
    )
    .subscribe(status => {
      if (status !== lastStatus) {
        lastStatus = status;
      }
      onStatus?.(status);
    });

  return channel;
}
