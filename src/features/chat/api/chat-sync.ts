'use client';

import type { ChatMessage } from '@lib-types/chat';
import type { SyncCursor } from '@lib-types/chat';
import { isChatMessageArray } from '@utils/chat-message';
import { SYNC_PAGE_LIMIT } from '../chat.constants';

type FetchChatSyncParams = {
  householdId: string;
  cursor?: SyncCursor | null;
  limit?: number;
};

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
