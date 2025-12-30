import { parseChatEntries } from '@helpers/expenses/expense-parser';
import {
  persistParsedExpenses,
  updateMessageStatus,
} from '@helpers/expenses/expense-persistence';
import { getUserPreferences } from '@helpers/user-prefs';
import type { ChatMessage } from '@lib-types/chat';

/**
 * Placeholder processor for chat messages (text/images) before expense creation.
 * Intended to run asynchronously and never block message delivery.
 */
export async function processChatMessage(message: ChatMessage) {
  const prefs = await getUserPreferences(message.user_id);
  const currency = prefs?.currency ?? 'USD';
  const result = parseChatEntries(message.content, currency);
  if (result.status !== 'parsed') {
    if (result.status === 'no_expense') {
      await updateMessageStatus(message.id, 'no_expense');
    }
    return result;
  }
  const needsCategory = result.entries.some(entry => !entry.category);
  const nextStatus = needsCategory ? 'needs_category' : 'processed';
  await persistParsedExpenses(message, result.entries, nextStatus);
  return result;
}
