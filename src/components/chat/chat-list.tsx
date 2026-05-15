'use client';

import { useChatVirtual } from '@features/chat/hooks/use-chat-virtual';
import type { MomoStreamState } from '@hooks/use-momo-stream';
import type { ChatMessage } from '@lib-types/chat';
import { Flex } from '@ui/flex/flex';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import styles from './chat-list.module.css';

type ChatListProps = {
  messages: ChatMessage[];
  renderMessage: (
    message: ChatMessage,
    previousMessage: ChatMessage | undefined,
  ) => ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  currentUserId?: string;
  /**
   * In-flight @momo streams. Passed through to `useChatVirtual` so the
   * autoscroll can react when the loader mounts or the streaming bubble
   * grows. Optional — falsy / empty map disables stream-driven scrolling.
   */
  pendingStreams?: ReadonlyMap<string, MomoStreamState>;
};

function ChatItemSlot({
  messageId,
  onMeasured,
  children,
}: {
  messageId: string;
  onMeasured: (id: string, height: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    onMeasured(messageId, node.offsetHeight);
  }, [messageId, onMeasured]);
  return (
    <div ref={ref} className={styles['chat-item-slot']}>
      {children}
    </div>
  );
}

export function ChatList({
  messages,
  renderMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  currentUserId,
  pendingStreams,
}: ChatListProps) {
  const { scrollerRef, recordHeight, onScroll } = useChatVirtual({
    messages,
    currentUserId,
    hasMore,
    isLoadingMore,
    onLoadMore,
    pendingStreams,
  });

  return (
    <div className={styles['chat-list-shell']}>
      <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
        <div className={styles['chat-list-inner']}>
          <div
            className={styles['chat-history-loader']}
            aria-hidden={!isLoadingMore}
          />
          {messages.map((msg, i) => (
            <ChatItemSlot
              key={msg.id}
              messageId={msg.id}
              onMeasured={recordHeight}
            >
              <Flex marginBottom={1} isFullWidth>
                {renderMessage(msg, messages[i - 1])}
              </Flex>
            </ChatItemSlot>
          ))}
        </div>
      </div>
    </div>
  );
}
