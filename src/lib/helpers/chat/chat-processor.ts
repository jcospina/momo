import type { ChatMessage } from '@lib-types/chat-messages';
import { parseChatEntries } from '@helpers/expenses/expense-parser';
import { persistParsedExpenses } from '@helpers/expenses/expense-persistence';
import { getUserPreferences } from '@helpers/user-prefs';

/**
 * Placeholder processor for chat messages (text/images) before expense creation.
 * Intended to run asynchronously and never block message delivery.
 */
export async function processChatMessage(message: ChatMessage) {
  const prefs = await getUserPreferences(message.user_id);
  const currency = prefs?.currency ?? 'USD';
  const result = parseChatEntries(message.content, currency);
  if (result.status !== 'parsed') {
    return result;
  }
  await persistParsedExpenses(message, result.entries);
  return result;
}
