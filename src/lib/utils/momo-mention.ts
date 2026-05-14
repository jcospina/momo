/**
 * Detects whether a chat message tags the @momo agent.
 *
 * Detection rules:
 * - `@momo` must appear as a standalone token: the left boundary is the start
 *   of the string or whitespace, the right boundary is whitespace, end of
 *   string, or common punctuation (`.,!?;:`).
 * - Case-insensitive (`@momo`, `@MoMo`, `@MOMO` all match).
 * - Substrings inside a longer word do NOT match (e.g. `@momology`,
 *   `email@momo.com`).
 *
 * The caller forwards the original content unchanged — no stripping happens
 * here.
 */
const MOMO_MENTION_PATTERN = /(?:^|\s)@momo(?=[\s.,!?;:]|$)/i;

export function parseMomoMention(content: string): { tagged: boolean } {
  return { tagged: MOMO_MENTION_PATTERN.test(content) };
}

/**
 * Builds the `idempotency_key` value used to deduplicate MoMo replies on the
 * `chat_messages` row. The persisted MoMo reply, the streaming agent route,
 * and the chat panel's stream/persisted-row correlation all share this key.
 */
export function momoIdempotencyKey(triggeringMessageId: string): string {
  return `momo:${triggeringMessageId}`;
}
