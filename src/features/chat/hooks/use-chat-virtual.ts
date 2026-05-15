'use client';

import type { MomoStreamState } from '@hooks/use-momo-stream';
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
  /**
   * Optional map of in-flight @momo streams keyed by triggering message id.
   * When this map's "content signal" grows (a new entry appears, or an
   * existing entry's text grows), the hook nudges the scroll position to
   * the bottom — but only if the user is already at the bottom. This keeps
   * the loader and streaming bubble in view as they mount and grow, without
   * yanking the user back down if they have scrolled up to read history.
   */
  pendingStreams?: ReadonlyMap<string, MomoStreamState>;
  /**
   * Whether the scroller's containing panel is the active tab. When the
   * panel is hidden via `display: none`, the scroller's `scrollHeight` and
   * `clientHeight` are 0, so the first-paint scroll-to-bottom no-ops and
   * the guard latches. We re-snap to the bottom on every false → true
   * transition so switching tabs always lands the user at the latest
   * message, matching the standard chat UX.
   */
  isActive?: boolean;
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

// Approximate upper bound for a smooth scrollTo to land. Used to flag when a
// programmatic scroll is still animating so path-D can distinguish "user
// scrolled away" from "the prior auto-scroll for the user's own message is
// still in flight and isAtBottomRef is transiently false".
const SMOOTH_SCROLL_INFLIGHT_MS = 600;

// Monotonic-growing scalar derived from the pending-streams map: it grows
// when a new stream enters and as existing streams accumulate tokens, and
// shrinks only when streams are filtered out. We use only the delta sign,
// not the absolute value.
function computePendingStreamsSignal(
  pendingStreams: ReadonlyMap<string, MomoStreamState> | undefined,
): number {
  if (!pendingStreams || pendingStreams.size === 0) return 0;
  let total = pendingStreams.size;
  for (const state of pendingStreams.values()) {
    total += state.text.length;
  }
  return total;
}

export function useChatVirtual({
  messages,
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  pendingStreams,
  isActive = true,
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
  const smoothScrollInFlightRef = useRef<boolean>(false);
  const smoothScrollClearTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Inlined-at-call helper: not a useCallback because including it in effect
  // dep arrays would change their size if it was added in a hot-reload patch,
  // triggering React's "array size changed" error. It only reads refs, so
  // identity stability doesn't matter — just call it directly.
  const startTrackedScroll = (scroller: HTMLElement) => {
    smoothScrollInFlightRef.current = true;
    if (smoothScrollClearTimerRef.current) {
      clearTimeout(smoothScrollClearTimerRef.current);
    }
    smoothScrollClearTimerRef.current = setTimeout(() => {
      smoothScrollInFlightRef.current = false;
      smoothScrollClearTimerRef.current = null;
    }, SMOOTH_SCROLL_INFLIGHT_MS);
    smoothScrollToBottom(scroller);
  };

  useEffect(
    () => () => {
      if (smoothScrollClearTimerRef.current) {
        clearTimeout(smoothScrollClearTimerRef.current);
      }
    },
    [],
  );

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

  // Tab activation. Both ChatPanels are mounted in parallel and toggled with
  // `display: none/flex`, so a hidden panel's scroller has scrollHeight=0 on
  // first commit and the first-paint effect above no-ops against it. Re-snap
  // to the bottom whenever the panel transitions from hidden → visible.
  const prevIsActiveRef = useRef<boolean>(isActive);
  useLayoutEffect(() => {
    const wasActive = prevIsActiveRef.current;
    prevIsActiveRef.current = isActive;
    if (wasActive || !isActive) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    debugLog('tab-activate', {
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    });
  }, [isActive]);

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
        startTrackedScroll(el);
      });
    }
  }, [messages, currentUserId]);

  // Path D: scroll on pending-stream growth. The loader + streaming bubble
  // are derived from `pendingStreams`, NOT `messages`, so they slip past
  // path-BC's append-driven autoscroll. Two cases:
  //   - New entry (loader mount): the user just sent an @momo message and
  //     path-BC's smooth-scroll for the optimistic user message is often
  //     still animating, so isAtBottomRef is transiently false. We trust
  //     `smoothScrollInFlightRef` to mean "we initiated that auto-scroll
  //     ourselves, so override isAtBottomRef here". When the user has
  //     genuinely scrolled away (no auto-scroll in flight), still respect
  //     isAtBottomRef.
  //   - Pure token growth: respect isAtBottomRef so we don't yank the user
  //     back down if they scrolled up to read history.
  const prevPendingStreamsSignalRef = useRef<number>(0);
  const prevPendingEntryCountRef = useRef<number>(0);

  useEffect(() => {
    const signal = computePendingStreamsSignal(pendingStreams);
    const prevSignal = prevPendingStreamsSignalRef.current;
    prevPendingStreamsSignalRef.current = signal;
    const entryCount = pendingStreams?.size ?? 0;
    const prevEntryCount = prevPendingEntryCountRef.current;
    prevPendingEntryCountRef.current = entryCount;
    if (signal <= prevSignal) return;
    const isNewEntry = entryCount > prevEntryCount;
    const allowScroll =
      isAtBottomRef.current || (isNewEntry && smoothScrollInFlightRef.current);
    if (!allowScroll) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    debugLog('path-D:stream-grow', {
      prevSignal,
      nextSignal: signal,
      prevEntryCount,
      nextEntryCount: entryCount,
      isNewEntry,
      isAtBottom: isAtBottomRef.current,
      autoScrollInFlight: smoothScrollInFlightRef.current,
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    });
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      startTrackedScroll(el);
    });
  }, [pendingStreams]);

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
