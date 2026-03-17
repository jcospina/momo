import type {
  ChatCursor,
  ChatMessage,
  DeleteChatMessageResult,
  SendChatMessageResult,
} from '@lib-types/chat';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MessageQueryOptions = {
  supabase?: SupabaseClient;
};

export type MessageListInput = {
  householdId?: string | null;
  userId?: string;
  limit?: number;
  options?: MessageQueryOptions;
};

export type MessageHistoryInput = {
  householdId?: string | null;
  userId?: string;
  cursor?: ChatCursor | null;
  limit?: number;
  options?: MessageQueryOptions;
};

export type MessageSinceInput = {
  householdId?: string | null;
  userId?: string;
  cursor?: ChatCursor | null;
  limit?: number;
  options?: MessageQueryOptions;
};

export type SendInput = {
  content: string;
  householdId?: string | null;
};

export type RemoveInput = {
  messageId: string;
};

export type MessageRealtimePayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  message: ChatMessage;
};

export type MessageRealtimeHandler = (payload: MessageRealtimePayload) => void;

export type PersonalSubscribeInput = {
  scope: 'personal';
  userId: string;
  client: SupabaseClient;
  onChange: MessageRealtimeHandler;
  onStatus?: (status: string) => void;
};

export type HouseholdSubscribeInput = {
  scope: 'household';
  householdId: string;
  client: SupabaseClient;
  onChange: MessageRealtimeHandler;
  onStatus?: (status: string) => void;
};

export type SubscribeInput = PersonalSubscribeInput | HouseholdSubscribeInput;

export type GetList = (input: MessageListInput) => Promise<ChatMessage[]>;

export type GetHistory = (input: MessageHistoryInput) => Promise<ChatMessage[]>;

export type GetSince = (input: MessageSinceInput) => Promise<ChatMessage[]>;

export type Send = (input: SendInput) => Promise<SendChatMessageResult>;

export type Remove = (input: RemoveInput) => Promise<DeleteChatMessageResult>;

export type Subscribe = (
  input: SubscribeInput,
) => ReturnType<SupabaseClient['channel']>;
