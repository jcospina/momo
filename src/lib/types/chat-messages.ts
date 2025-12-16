export type ChatMessageStatus = 'pending' | 'processed' | 'failed';

export type ChatMessage = {
  id: string;
  household_id: string | null;
  user_id: string;
  content: string;
  status: ChatMessageStatus;
  expense_id: string | null;
  created_at: string;
  sender_name: string | null;
};

export type SendChatMessageResult = {
  errorCode?: 'message_empty' | 'auth_required' | 'chat_message_send_failed';
  message?: ChatMessage;
};
