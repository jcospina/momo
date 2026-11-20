'use client';

import { useChatScroll } from '@features/chat/hooks/use-chat-scroll';
import type { ChatMessage } from '@lib-types/chat';
import { cn } from '@utils/cn';
import type { ReactNode } from 'react';
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
   * Whether the enclosing panel is the active tab. Required when sibling
   * panels are mounted in parallel and toggled with `display: none`, so the
   * list can jump back to the latest message on tab activation. Defaults to
   * true for stand-alone usage.
   */
  isActive?: boolean;
  /** Extra class for the row container (width, padding). */
  innerClassName?: string;
};

export function ChatList({
  messages,
  renderMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  currentUserId,
  isActive = true,
  innerClassName,
}: ChatListProps) {
  const { scrollerRef, onScroll } = useChatScroll({
    messages,
    currentUserId,
    hasMore,
    isLoadingMore,
    onLoadMore,
    isActive,
  });

  // The rows must stay the only children of `.chat-list-inner`: the scroll
  // helper treats that element's children as the rows it keeps in place.
  return (
    <div className={styles['chat-list-shell']}>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={onScroll}
        aria-busy={isLoadingMore}
      >
        <div className={cn(styles['chat-list-inner'], innerClassName)}>
          {messages.map((msg, i) => (
            <div key={msg.id} className={styles['chat-item-slot']}>
              {renderMessage(msg, messages[i - 1])}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
