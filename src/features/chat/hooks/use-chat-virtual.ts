'use client';

import type { ChatMessage } from '@lib-types/chat';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export const AT_BOTTOM_THRESHOLD_PX = 48;
export const PREFETCH_THRESHOLD_PX = 240;

const DEBUG =
  typeof window !== 'undefined' &&
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test';

function debugLog(label: string, data: Record<string, unknown>) {
  if (!DEBUG) return;
  console.log(`[ChatVirtual:${label}]`, data);
}

type UseChatVirtualArgs = {
  messages: ChatMessage[];
  currentUserId?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

export type UseChatVirtualResult = {
  scrollerRef: RefObject<HTMLDivElement | null>;
  recordHeight: (id: string, height: number) => void;
  onScroll: () => void;
  isAtBottom: boolean;
};

function getPrependedCount(
  previousMessages: ChatMessage[],
  currentMessages: ChatMessage[],
) {
  if (!previousMessages.length) return 0;
  if (currentMessages.length <= previousMessages.length) return 0;
  const previousFirstId = previousMessages[0]?.id;
  const preservedStartIndex = currentMessages.findIndex(
    m => m.id === previousFirstId,
  );
  if (preservedStartIndex <= 0) return 0;
  const preservedCount = Math.min(
    previousMessages.length,
    currentMessages.length - preservedStartIndex,
  );
  for (let i = 0; i < preservedCount; i += 1) {
    if (
      currentMessages[preservedStartIndex + i]?.id !== previousMessages[i]?.id
    ) {
      return 0;
    }
  }
  return preservedStartIndex;
}

function isReconciliation(
  prev: ChatMessage[] | null,
  curr: ChatMessage[],
): boolean {
  if (!prev || prev.length !== curr.length || curr.length === 0) return false;
  const p = prev[prev.length - 1];
  const c = curr[curr.length - 1];
  if (!p || !c) return false;
  return p.id !== c.id && p.id.startsWith('tmp-') && p.content === c.content;
}

function smoothScrollToBottom(scroller: HTMLElement) {
  scroller.scrollTo({
    top: scroller.scrollHeight - scroller.clientHeight,
    behavior: 'smooth',
  });
}

export function useChatVirtual({
  messages,
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: UseChatVirtualArgs): UseChatVirtualResult {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const heightCacheRef = useRef<Map<string, number>>(new Map());
  const prevMessagesRef = useRef<ChatMessage[] | null>(null);
  const prevLastIdRef = useRef<string | null>(
    messages[messages.length - 1]?.id ?? null,
  );
  const lastTriggeredOldestIdRef = useRef<string | null>(null);
  const pendingPrependRef = useRef<{
    ids: string[];
    previousScrollHeight: number;
  } | null>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const didFirstPaintScrollRef = useRef<boolean>(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // In-render diff. Detects prepend (for path A) and reconciliation
  // (warm-start the height cache so the re-mounted item under the real id
  // doesn't appear as "estimated" to any future windowed build).
  // Idempotent under React strict mode / concurrent re-render.
  const prevMessages = prevMessagesRef.current;
  if (prevMessages && prevMessages !== messages) {
    const prependedCount = getPrependedCount(prevMessages, messages);
    if (prependedCount > 0) {
      if (scrollerRef.current) {
        pendingPrependRef.current = {
          ids: messages.slice(0, prependedCount).map(m => m.id),
          previousScrollHeight: scrollerRef.current.scrollHeight,
        };
        debugLog('render:prepend', {
          prependedCount,
          previousScrollHeight: scrollerRef.current.scrollHeight,
          firstPrependedId: messages[0]?.id,
        });
      } else {
        debugLog('render:prepend-skipped', {
          prependedCount,
          reason: 'scrollerRef.current is null',
        });
      }
    }
    if (isReconciliation(prevMessages, messages)) {
      const tmpId = prevMessages[prevMessages.length - 1]!.id;
      const realId = messages[messages.length - 1]!.id;
      const cached = heightCacheRef.current.get(tmpId);
      if (cached !== undefined) {
        heightCacheRef.current.set(realId, cached);
      }
      debugLog('render:reconcile', { tmpId, realId, cached });
    }
  }

  // First-paint scroll-to-bottom. Runs once after first commit. By this point
  // every ChatItemSlot child has already mounted (children's layout effects
  // fire before parent's), so scrollHeight reflects the real total.
  useLayoutEffect(() => {
    if (didFirstPaintScrollRef.current) return;
    didFirstPaintScrollRef.current = true;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    isAtBottomRef.current = true;
    debugLog('first-paint', {
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    });
  }, []);

  // Path A: prepend anchor. Synchronous, before paint.
  useLayoutEffect(() => {
    const pending = pendingPrependRef.current;
    if (!pending) return;
    pendingPrependRef.current = null;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const newScrollHeight = scroller.scrollHeight;
    const prevIds = new Set(prevMessagesRef.current?.map(m => m.id) ?? []);
    const prependedSet = new Set(pending.ids);
    let deltaAppended = 0;
    for (const m of messages) {
      if (prevIds.has(m.id) || prependedSet.has(m.id)) continue;
      deltaAppended += heightCacheRef.current.get(m.id) ?? 0;
    }
    const deltaPrepend =
      newScrollHeight - pending.previousScrollHeight - deltaAppended;
    const before = scroller.scrollTop;
    scroller.scrollTop = before + deltaPrepend;
    debugLog('path-A', {
      previousScrollHeight: pending.previousScrollHeight,
      newScrollHeight,
      deltaAppended,
      deltaPrepend,
      scrollTopBefore: before,
      scrollTopAfter: scroller.scrollTop,
      clientHeight: scroller.clientHeight,
    });
  }, [messages]);

  // Paths B and C: scroll on append.
  useEffect(() => {
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;
    const previousMessages = prevMessagesRef.current;
    const prevLastId = prevLastIdRef.current;
    prevLastIdRef.current = lastId;
    prevMessagesRef.current = messages;

    if (!lastId || lastId === prevLastId) return;
    if (isReconciliation(previousMessages, messages)) {
      debugLog('path-BC:bail-reconcile', { lastId, prevLastId });
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const isOwnSend = !!last && last.user_id === currentUserId;
    const willScroll = isOwnSend || isAtBottomRef.current;
    debugLog('path-BC:append', {
      lastId,
      prevLastId,
      isOwnSend,
      isAtBottomRef: isAtBottomRef.current,
      willScroll,
      currentScrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    });
    if (willScroll) {
      requestAnimationFrame(() => {
        const el = scrollerRef.current;
        if (!el) return;
        smoothScrollToBottom(el);
      });
    }
  }, [messages, currentUserId]);

  const recordHeight = useCallback((id: string, height: number) => {
    heightCacheRef.current.set(id, height);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottomNow = distanceFromBottom <= AT_BOTTOM_THRESHOLD_PX;
    if (atBottomNow !== isAtBottomRef.current) {
      debugLog('onScroll:cross-threshold', {
        scrollTop: el.scrollTop,
        distanceFromBottom,
        was: isAtBottomRef.current,
        now: atBottomNow,
      });
      isAtBottomRef.current = atBottomNow;
      setIsAtBottom(atBottomNow);
    }
    if (hasMore && !isLoadingMore && el.scrollTop <= PREFETCH_THRESHOLD_PX) {
      const oldestId = messages[0]?.id ?? null;
      if (oldestId && lastTriggeredOldestIdRef.current !== oldestId) {
        lastTriggeredOldestIdRef.current = oldestId;
        debugLog('onScroll:trigger-load-more', {
          scrollTop: el.scrollTop,
          oldestId,
        });
        onLoadMore?.();
      }
    } else if (el.scrollTop > PREFETCH_THRESHOLD_PX) {
      lastTriggeredOldestIdRef.current = null;
    }
  }, [hasMore, isLoadingMore, messages, onLoadMore]);

  return {
    scrollerRef,
    recordHeight,
    onScroll,
    isAtBottom,
  };
}
