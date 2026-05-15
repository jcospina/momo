import type { ChatMessage } from '@lib-types/chat';

export const CHAT_MESSAGE_SELECT =
  'id, household_id, user_id, content, status, expense_count, ' +
  'created_at, sender_name, author_kind, momo_source, momo_invocation_tagged, ' +
  'idempotency_key';

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;
  return (
    typeof msg.id === 'string' &&
    typeof msg.created_at === 'string' &&
    typeof msg.content === 'string' &&
    typeof msg.expense_count === 'number' &&
    'household_id' in msg &&
    'user_id' in msg &&
    (msg.author_kind === 'user' || msg.author_kind === 'momo') &&
    (msg.momo_source === null || typeof msg.momo_source === 'string') &&
    typeof msg.momo_invocation_tagged === 'boolean' &&
    (msg.idempotency_key === null || typeof msg.idempotency_key === 'string')
  );
}

export function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every(isChatMessage);
}

export function isMomoMessage(message: ChatMessage): boolean {
  return message.author_kind === 'momo';
}
