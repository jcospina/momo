import type { ChatMessage } from '@lib-types/chat-messages';

/**
 * Placeholder processor for chat messages (text/images) before expense creation.
 * Intended to run asynchronously and never block message delivery.
 */
export async function processChatMessage(_message: ChatMessage) {
  return Promise.resolve();
}
