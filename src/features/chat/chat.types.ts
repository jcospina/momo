import type { ChatMessage } from '@lib-types/chat-messages';

export type ChatCursor = {
  created_at: string;
  id: string;
};

export type SyncCursor = ChatCursor;

export type SyncReason = 'visibility' | 'resubscribed' | 'cooldown' | 'pending';

export type RealtimeState =
  | 'idle'
  | 'subscribing'
  | 'subscribed'
  | 'error'
  | 'resubscribing';

export type ChatMessageShape = ChatMessage;
