'use client';

import type { ChatMessage } from '@lib-types/chat-messages';
import { SYNC_PAGE_LIMIT } from '../chat.constants';
import type { SyncCursor } from '../chat.types';

type FetchChatSyncParams = {
  householdId: string;
  cursor?: SyncCursor | null;
  limit?: number;
};

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

export async function fetchChatSync({
  householdId,
  cursor,
  limit = SYNC_PAGE_LIMIT,
}: FetchChatSyncParams): Promise<ChatMessage[]> {
  const res = await fetch('/api/chat-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      household_id: householdId,
      cursor_created_at: cursor?.created_at ?? null,
      cursor_id: cursor?.id ?? null,
      limit,
    }),
  });

  if (!res.ok) {
    throw new Error(`chat_sync_failed_${res.status}`);
  }

  const data = (await res.json()) as { messages?: unknown };
  if (!isChatMessageArray(data.messages)) {
    console.warn('[realtime] chat sync invalid payload', {
      household_id: householdId,
      cursor,
      limit,
      body: data,
    });
    return [];
  }
  return data.messages;
}
