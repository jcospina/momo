export type ChatMessageStatus =
  | 'pending'
  | 'processed'
  | 'needs_category'
  | 'failed'
  | 'no_expense';

export type ChatMessage = {
  id: string;
  household_id: string | null;
  user_id: string;
  content: string;
  status: ChatMessageStatus;
  expense_count: number;
  created_at: string;
  sender_name: string | null;
};

export type SendChatMessageResult = {
  errorCode?: 'message_empty' | 'auth_required' | 'chat_message_send_failed';
  message?: ChatMessage;
};

export type DeleteChatMessageResult = {
  errorCode?:
    | 'auth_required'
    | 'chat_message_delete_failed'
    | 'chat_message_not_found';
  messageId?: string;
};

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
