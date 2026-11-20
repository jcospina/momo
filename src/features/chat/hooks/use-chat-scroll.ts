'use client';

import {
  createStickToBottom,
  type StickToBottom,
} from '@features/chat/lib/stick-to-bottom';
import type { ChatMessage } from '@lib-types/chat';
import { isMomoMessage } from '@utils/chat-message';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/** How close to the end, in pixels, still counts as reading the latest message. */
export const AT_BOTTOM_THRESHOLD_PX = 48;

/**
 * Older history starts loading once the reader is within this many pixels of
 * the top, or within one viewport height if that is larger. Loading well
 * before the top means a fast fling rarely hits the end of the list while the
 * request is in flight.
 */
export const MIN_PREFETCH_DISTANCE_PX = 480;

type UseChatScrollArgs = {
  messages: ChatMessage[];
  currentUserId?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  /**
   * Whether the scroller's panel is the active tab. Both chat panels stay
   * mounted and the hidden one uses `display: none`, which resets its scroll
   * position, so the list jumps back to the latest message whenever its panel
   * becomes active.
   */
  isActive?: boolean;
};

export type UseChatScrollResult = {
  scrollerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
};

function isWithinPrefetchDistance(scroller: HTMLElement) {
  const prefetchDistance = Math.max(
    MIN_PREFETCH_DISTANCE_PX,
    scroller.clientHeight,
  );
  return scroller.scrollTop <= prefetchDistance;
}

/** The optimistic `tmp-*` row was swapped for the persisted one. */
function isReconciliation(
  previous: ChatMessage | undefined,
  current: ChatMessage,
) {
  return (
    previous !== undefined &&
    previous.id.startsWith('tmp-') &&
    !current.id.startsWith('tmp-') &&
    previous.content === current.content
  );
}

function isSentByUser(message: ChatMessage, currentUserId?: string) {
  return (
    currentUserId !== undefined &&
    message.user_id === currentUserId &&
    !isMomoMessage(message)
  );
}

/**
 * Scroll behaviour for the chat list:
 * - opens at the latest message and follows new content (new messages, the
 *   @momo loader, streamed text) while the reader is at the bottom;
 * - keeps the reader's place when they scroll up, including while older
 *   messages are prepended above them;
 * - jumps to the latest message when the user sends one;
 * - asks for older messages as the reader nears the top.
 *
 * Following and place-keeping come from `createStickToBottom`, which watches
 * the rendered rows, so this hook never measures rows itself.
 */
export function useChatScroll({
  messages,
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  isActive = true,
}: UseChatScrollArgs): UseChatScrollResult {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom] = useState<StickToBottom>(() =>
    createStickToBottom({ threshold: AT_BOTTOM_THRESHOLD_PX }),
  );
  const lastMessageRef = useRef<ChatMessage | undefined>(messages.at(-1));
  const requestedOldestIdRef = useRef<string | null>(null);

  // Layout effects so the first frame the reader sees is already at the end.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    return stickToBottom.connect(scroller);
  }, [stickToBottom]);

  useLayoutEffect(() => {
    if (isActive) {
      stickToBottom.scrollToBottom();
    }
  }, [isActive, stickToBottom]);

  useLayoutEffect(() => {
    const previousLast = lastMessageRef.current;
    const last = messages.at(-1);
    lastMessageRef.current = last;
    if (!last || last.id === previousLast?.id) return;
    if (isReconciliation(previousLast, last)) return;
    if (isSentByUser(last, currentUserId)) {
      stickToBottom.scrollToBottom();
    }
  }, [messages, currentUserId, stickToBottom]);

  const maybeLoadOlder = useCallback(() => {
    const scroller = scrollerRef.current;
    // A hidden panel has no height; it would always look "near the top".
    if (!scroller || scroller.clientHeight === 0) return;
    if (!isWithinPrefetchDistance(scroller)) {
      requestedOldestIdRef.current = null;
      return;
    }
    if (!hasMore || isLoadingMore || !onLoadMore) return;
    const oldestId = messages[0]?.id ?? null;
    // One request per oldest message: once older ones land, the oldest id
    // changes and the next request is allowed.
    if (!oldestId || requestedOldestIdRef.current === oldestId) return;
    requestedOldestIdRef.current = oldestId;
    onLoadMore();
  }, [hasMore, isLoadingMore, messages, onLoadMore]);

  // Also check without a scroll event: after a page of history lands the
  // reader may still be near the top, and a short history may not scroll.
  // The check waits one microtask so the stick-to-bottom helper has already
  // moved the reader past a page that just landed above them (its
  // MutationObserver callback was queued during the commit, so it runs
  // first); otherwise the old position would ask for one page too many.
  useEffect(() => {
    let isCurrent = true;
    queueMicrotask(() => {
      if (isCurrent) maybeLoadOlder();
    });
    return () => {
      isCurrent = false;
    };
  }, [maybeLoadOlder]);

  return { scrollerRef, onScroll: maybeLoadOlder };
}
