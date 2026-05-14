import {
  deleteChatMessage as deleteChatMessageAction,
  sendChatMessage as sendChatMessageAction,
} from '@actions/chat-messages';
import {
  subscribeToHouseholdChat,
  subscribeToPersonalChat,
} from '@helpers/chat/chat-realtime';
import { isChatMessageArray } from '@utils/chat-message';

import type {
  GetHistory,
  GetSince,
  Remove,
  Send,
  StreamMomo,
  Subscribe,
} from './types';

const DEFAULT_HISTORY_LIMIT = 30;
const DEFAULT_SYNC_LIMIT = 100;

export const getList: GetHistory = async ({
  householdId = null,
  cursor,
  limit = DEFAULT_HISTORY_LIMIT,
}) => {
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
};

export const getSince: GetSince = async ({
  householdId = null,
  cursor,
  limit = DEFAULT_SYNC_LIMIT,
}) => {
  const res = await fetch('/api/chat-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      household_id: householdId ?? null,
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
      household_id: householdId ?? null,
      cursor,
      limit,
      body: data,
    });
    return [];
  }

  return data.messages;
};

export const send: Send = async input => sendChatMessageAction(input);

export const remove: Remove = async input => deleteChatMessageAction(input);

export const streamMomo: StreamMomo = ({
  content,
  householdId,
  triggeringMessageId,
  signal,
}) => {
  async function* iterate(): AsyncIterable<string> {
    const res = await fetch('/api/momo-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content, householdId, triggeringMessageId }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`momo_stream_failed_${res.status}`);
    }

    if (!res.body) {
      throw new Error('momo_stream_failed_no_body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) yield chunk;
      }
      const tail = decoder.decode();
      if (tail) yield tail;
    } finally {
      reader.releaseLock();
    }
  }

  return iterate();
};

export const subscribe: Subscribe = input => {
  if (input.scope === 'household') {
    return subscribeToHouseholdChat(
      input.householdId,
      input.client,
      input.onChange,
      input.onStatus,
    );
  }

  return subscribeToPersonalChat(
    input.userId,
    input.client,
    input.onChange,
    input.onStatus,
  );
};
