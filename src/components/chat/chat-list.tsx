'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useChatList } from '@features/chat/hooks/use-chat-list';
import type { ChatMessage } from '@lib-types/chat-messages';
import { Flex } from '@ui/flex/flex';

import { MomoLoader } from '@components/loader/loader';
import styles from './chat-list.module.css';

type ChatListProps = {
  messages: ChatMessage[];
  renderMessage: (message: ChatMessage) => ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  currentUserId?: string;
};

const TOP_SPACER = 'var(--spacing)';
const AT_BOTTOM_THRESHOLD_PX = 48;

export function ChatList({
  messages,
  renderMessage,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  currentUserId,
}: ChatListProps) {
  const { virtuosoRef, isAtBottom, handleAtBottomChange, handleRangeChanged } =
    useChatList({
      messages,
      currentUserId,
      hasMore,
      isLoadingMore,
      onLoadMore,
    });

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      style={{ height: '100%' }}
      initialTopMostItemIndex={Math.max(messages.length - 1, 0)}
      atBottomStateChange={handleAtBottomChange}
      atBottomThreshold={AT_BOTTOM_THRESHOLD_PX}
      followOutput={isAtBottom ? 'smooth' : false}
      rangeChanged={handleRangeChanged}
      computeItemKey={(_, item) => item.id}
      components={{
        Scroller: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
          function Scroller(props: HTMLAttributes<HTMLDivElement>, ref) {
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
        ),
        List: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
          function List(props: HTMLAttributes<HTMLDivElement>, ref) {
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
          },
        ),
        Item: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
          function Item(props: HTMLAttributes<HTMLDivElement>, ref) {
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
        ),
        Header: () => (
          <div>
            {isLoadingMore ? (
              <div className={styles['chat-history-loading']}>
                <MomoLoader size="xs" />
              </div>
            ) : null}
            <div style={{ height: TOP_SPACER }} />
          </div>
        ),
      }}
      itemContent={(_, msg) => (
        <Flex marginBottom={1} isFullWidth>
          {renderMessage(msg)}
        </Flex>
      )}
    />
  );
}
