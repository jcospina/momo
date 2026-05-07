'use client';

import { useChatList } from '@features/chat/hooks/use-chat-list';
import type { ChatMessage } from '@lib-types/chat';
import { Flex } from '@ui/flex/flex';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { type Components, Virtuoso } from 'react-virtuoso';
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
};

const AT_BOTTOM_THRESHOLD_PX = 48;

const ChatScroller = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ChatScroller(props: HTMLAttributes<HTMLDivElement>, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={styles.scroller}
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          ...(props.style || {}),
        }}
      />
    );
  },
);

const ChatListWrapper = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function ChatListWrapper(props: HTMLAttributes<HTMLDivElement>, ref) {
  return (
    <div
      {...props}
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        padding: 'var(--spacing)',
        boxSizing: 'border-box',
        ...(props.style || {}),
      }}
    />
  );
});

const ChatItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ChatItem(props: HTMLAttributes<HTMLDivElement>, ref) {
    return (
      <div
        {...props}
        ref={ref}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          ...(props.style || {}),
        }}
      />
    );
  },
);

function ChatHistoryHeader(): ReactNode {
  return <div className={styles['chat-history-spacer']} />;
}

const VIRTUOSO_COMPONENTS: Components<ChatMessage> = {
  Scroller: ChatScroller,
  List: ChatListWrapper,
  Item: ChatItem,
  Header: ChatHistoryHeader,
};

export function ChatList({
  messages,
  renderMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  currentUserId,
}: ChatListProps) {
  const {
    virtuosoRef,
    messages: listMessages,
    firstItemIndex,
    isAtBottom,
    handleAtBottomChange,
    handleRangeChanged,
  } = useChatList({
    messages,
    currentUserId,
    hasMore,
    isLoadingMore,
    onLoadMore,
  });

  return (
    <div className={styles['chat-list-shell']}>
      <Virtuoso
        ref={virtuosoRef}
        data={listMessages}
        firstItemIndex={firstItemIndex}
        style={{ height: '100%' }}
        initialTopMostItemIndex={{ index: 'LAST', align: 'end' }}
        atBottomStateChange={handleAtBottomChange}
        atBottomThreshold={AT_BOTTOM_THRESHOLD_PX}
        followOutput={isAtBottom && !isLoadingMore ? 'smooth' : false}
        rangeChanged={handleRangeChanged}
        computeItemKey={(_, item) => item.id}
        components={VIRTUOSO_COMPONENTS}
        skipAnimationFrameInResizeObserver
        itemContent={(index, msg) => {
          const messageIndex = index - firstItemIndex;
          return (
            <Flex marginBottom={1} isFullWidth>
              {renderMessage(msg, listMessages[messageIndex - 1])}
            </Flex>
          );
        }}
      />
    </div>
  );
}
