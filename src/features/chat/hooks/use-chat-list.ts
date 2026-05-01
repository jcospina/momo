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

type ChatListState = {
  messages: ChatMessage[];
  firstItemIndex: number;
};

const PREFETCH_THRESHOLD_ITEMS = 5;
const INITIAL_FIRST_ITEM_INDEX = 10_000;

function getPrependedCount(
  previousMessages: ChatMessage[],
  currentMessages: ChatMessage[],
) {
  if (!previousMessages.length) return 0;
  if (currentMessages.length <= previousMessages.length) return 0;

  const previousFirstId = previousMessages[0]?.id;
  const preservedStartIndex = currentMessages.findIndex(
    message => message.id === previousFirstId,
  );
  if (preservedStartIndex <= 0) return 0;

  const preservedCount = Math.min(
    previousMessages.length,
    currentMessages.length - preservedStartIndex,
  );
  for (let index = 0; index < preservedCount; index += 1) {
    if (
      currentMessages[preservedStartIndex + index]?.id !==
      previousMessages[index]?.id
    ) {
      return 0;
    }
  }

  return preservedStartIndex;
}

export function useChatList({
  messages,
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: UseChatListArgs) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [listState, setListState] = useState<ChatListState>(() => ({
    messages,
    firstItemIndex: INITIAL_FIRST_ITEM_INDEX,
  }));
  const prevLastIdRef = useRef<string | null>(
    messages[messages.length - 1]?.id ?? null,
  );
  const lastTriggeredIdRef = useRef<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  let effectiveListState = listState;
  if (listState.messages !== messages) {
    const prependedCount = getPrependedCount(listState.messages, messages);
    effectiveListState = {
      messages,
      firstItemIndex:
        prependedCount > 0
          ? Math.max(listState.firstItemIndex - prependedCount, 1)
          : listState.firstItemIndex,
    };
    setListState(effectiveListState);
  }
  const { firstItemIndex, messages: listMessages } = effectiveListState;

  const hasMoreToLoad = hasMore && typeof onLoadMore === 'function';

  const latestMessageUserId = useMemo(() => {
    const last = listMessages[listMessages.length - 1];
    return last?.user_id ?? null;
  }, [listMessages]);

  useEffect(() => {
    const lastMessage = listMessages[listMessages.length - 1];
    const lastId = lastMessage?.id ?? null;
    const prevLastId = prevLastIdRef.current;
    const appended = lastId && lastId !== prevLastId;
    if (appended && currentUserId && latestMessageUserId === currentUserId) {
      virtuosoRef.current?.scrollToIndex({
        index: firstItemIndex + listMessages.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }
    prevLastIdRef.current = lastId;
  }, [currentUserId, firstItemIndex, latestMessageUserId, listMessages]);

  const handleRangeChanged = useCallback(
    (range: ListRange) => {
      if (!hasMoreToLoad || isLoadingMore) return;
      const firstVisibleMessageIndex = range.startIndex - firstItemIndex;
      if (firstVisibleMessageIndex > PREFETCH_THRESHOLD_ITEMS) {
        lastTriggeredIdRef.current = null;
        return;
      }
      const oldestId = listMessages[0]?.id ?? null;
      if (!oldestId) return;
      if (lastTriggeredIdRef.current === oldestId) return;
      lastTriggeredIdRef.current = oldestId;
      onLoadMore?.();
    },
    [firstItemIndex, hasMoreToLoad, isLoadingMore, listMessages, onLoadMore],
  );

  const handleAtBottomChange = useCallback((value: boolean) => {
    setIsAtBottom(value);
  }, []);

  return {
    virtuosoRef,
    messages: listMessages,
    firstItemIndex,
    isAtBottom,
    handleAtBottomChange,
    handleRangeChanged,
  };
}
