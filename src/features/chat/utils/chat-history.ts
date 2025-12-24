'use client';

import type { ChatMessage } from '@lib-types/chat-messages';
import type { ChatCursor } from '../chat.types';

type FetchChatHistoryParams = {
  householdId?: string | null;
  cursor?: ChatCursor | null;
  limit?: number;
};

const DEFAULT_LIMIT = 30;

function isChatMessageShape(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;
  return (
    typeof msg.id === 'string' &&
    typeof msg.created_at === 'string' &&
    typeof msg.content === 'string' &&
    'household_id' in msg &&
    'user_id' in msg
  );
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every(isChatMessageShape);
}

export async function fetchChatHistory({
  householdId = null,
  cursor,
  limit = DEFAULT_LIMIT,
}: FetchChatHistoryParams): Promise<ChatMessage[]> {
  const res = await fetch('/api/chat-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      household_id: householdId,
      before_created_at: cursor?.created_at ?? null,
      before_id: cursor?.id ?? null,
      limit,
    }),
  });

  if (!res.ok) {
    throw new Error(`chat_history_failed_${res.status}`);
  }

  const data = (await res.json()) as { messages?: unknown };
  if (!isChatMessageArray(data.messages)) {
    console.warn('[chat] history invalid payload', {
      household_id: householdId,
      cursor,
      limit,
      body: data,
    });
    return [];
  }
  return data.messages;
}
