import type { ChatMessage } from '@lib-types/chat';

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Record<string, unknown>;
  return (
    typeof msg.id === 'string' &&
    typeof msg.created_at === 'string' &&
    typeof msg.content === 'string' &&
    typeof msg.expense_count === 'number' &&
    'household_id' in msg &&
    'user_id' in msg
  );
}

export function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every(isChatMessage);
}
