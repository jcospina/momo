'use client';

import type { ChatMessage } from '@lib-types/chat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListRange, VirtuosoHandle } from 'react-virtuoso';

type UseChatListArgs = {
  messages: ChatMessage[];
  currentUserId?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

const PREFETCH_THRESHOLD_ITEMS = 5;
const INITIAL_FIRST_ITEM_INDEX = 10_000;

export function useChatList({
  messages,
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: UseChatListArgs) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [firstItemIndex, setFirstItemIndex] = useState(
    INITIAL_FIRST_ITEM_INDEX,
  );
  const prevLastIdRef = useRef<string | null>(
    messages[messages.length - 1]?.id ?? null,
  );
  const loadStartLengthRef = useRef<number | null>(null);
  const lastTriggeredIdRef = useRef<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const hasMoreToLoad = hasMore && typeof onLoadMore === 'function';

  const latestMessageUserId = useMemo(() => {
    const last = messages[messages.length - 1];
    return last?.user_id ?? null;
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.id ?? null;
    const prevLastId = prevLastIdRef.current;
    const appended = lastId && lastId !== prevLastId;
    if (appended && currentUserId && latestMessageUserId === currentUserId) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }
    prevLastIdRef.current = lastId;
  }, [currentUserId, latestMessageUserId, messages]);

  useEffect(() => {
    if (isLoadingMore) {
      if (loadStartLengthRef.current === null) {
        loadStartLengthRef.current = messages.length;
      }
      return;
    }

    if (loadStartLengthRef.current === null) return;
    const prependedCount = messages.length - loadStartLengthRef.current;
    if (prependedCount > 0) {
      setFirstItemIndex(prev => Math.max(prev - prependedCount, 1));
    }
    loadStartLengthRef.current = null;
  }, [isLoadingMore, messages.length]);

  const handleRangeChanged = useCallback(
    (range: ListRange) => {
      if (!hasMoreToLoad || isLoadingMore) return;
      if (range.startIndex > PREFETCH_THRESHOLD_ITEMS) {
        lastTriggeredIdRef.current = null;
        return;
      }
      const oldestId = messages[0]?.id ?? null;
      if (!oldestId) return;
      if (lastTriggeredIdRef.current === oldestId) return;
      lastTriggeredIdRef.current = oldestId;
      onLoadMore?.();
    },
    [hasMoreToLoad, isLoadingMore, messages, onLoadMore],
  );

  const handleAtBottomChange = useCallback((value: boolean) => {
    setIsAtBottom(value);
  }, []);

  return {
    virtuosoRef,
    firstItemIndex,
    isAtBottom,
    handleAtBottomChange,
    handleRangeChanged,
  };
}
