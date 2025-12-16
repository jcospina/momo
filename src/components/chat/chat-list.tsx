'use client';

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import type { ChatMessage } from '@lib-types/chat-messages';
import { Flex } from '@ui/flex/flex';

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
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const prevCountRef = useRef(messages.length);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const hasMoreToLoad = hasMore && typeof onLoadMore === 'function';

  const latestMessageUserId = useMemo(() => {
    const last = messages[messages.length - 1];
    return last?.user_id ?? null;
  }, [messages]);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    const grew = messages.length > prevCount;
    if (grew && currentUserId && latestMessageUserId === currentUserId) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }
    prevCountRef.current = messages.length;
  }, [currentUserId, latestMessageUserId, messages.length]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      style={{ height: '100%' }}
      initialTopMostItemIndex={Math.max(messages.length - 1, 0)}
      atBottomStateChange={setIsAtBottom}
      atBottomThreshold={AT_BOTTOM_THRESHOLD_PX}
      followOutput={isAtBottom ? 'smooth' : false}
      startReached={() => {
        if (!hasMoreToLoad || isLoadingMore) return;
        onLoadMore?.();
      }}
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
        Header: () => <div style={{ height: TOP_SPACER }} />,
      }}
      itemContent={(_, msg) => (
        <Flex marginBottom={1} isFullWidth>
          {renderMessage(msg)}
        </Flex>
      )}
    />
  );
}
