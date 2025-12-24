'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { sendChatMessage } from '@actions/chat-messages';
import { ChatMessage as ChatMessageItem } from '@components/chat/chat-message';
import { SendButton } from '@components/chat/send-button';
import { ChatToggle } from '@components/chat/toggle/chat-toggle';
import { useChatState } from '@features/chat/hooks/use-chat-state';
import { useComposer } from '@features/chat/hooks/use-composer';
import { useHouseholdRealtime } from '@features/chat/hooks/use-household-realtime';
import { useHouseholdSync } from '@features/chat/hooks/use-household-sync';
import { fetchChatHistory } from '@features/chat/utils/chat-history';
import type { ChatMessage } from '@lib-types/chat-messages';
import { Divider } from '@ui/divider/divider';
import { FlexItem } from '@ui/flex-item/flex-item';
import { Flex } from '@ui/flex/flex';
import { Input } from '@ui/input/input';
import { Panel } from '@ui/panel/panel';
import { format } from 'date-fns';
import { ChatList } from './chat-list';

import styles from './chat.module.css';

interface ChatProps {
  householdName?: string;
  householdId?: string | null;
  userId: string;
  initialPersonalMessages: ChatMessage[];
  initialHouseholdMessages: ChatMessage[];
}

const HISTORY_PAGE_SIZE = 30;

export function Chat({
  householdName,
  householdId = null,
  userId,
  initialPersonalMessages,
  initialHouseholdMessages,
}: ChatProps) {
  const {
    activeTab,
    setActiveTab,
    isHousehold,
    messages,
    addOptimistic,
    markFailed,
    reconcile,
    mergeRealtime,
    mergeBatch,
    mergePersonalBatch,
    householdCursorRef,
    personalMessages,
    householdMessages,
  } = useChatState({
    userId,
    householdId,
    initialPersonalMessages,
    initialHouseholdMessages,
  });

  const [isLoadingMorePersonal, setIsLoadingMorePersonal] = useState(false);
  const [isLoadingMoreHousehold, setIsLoadingMoreHousehold] = useState(false);
  const [personalHasMore, setPersonalHasMore] = useState(
    initialPersonalMessages.length >= HISTORY_PAGE_SIZE,
  );
  const [householdHasMore, setHouseholdHasMore] = useState(
    Boolean(householdId) &&
      initialHouseholdMessages.length >= HISTORY_PAGE_SIZE,
  );

  const statusRef = useRef<string | null>(null);
  const errorStatuses = useRef(
    new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']),
  );

  const getHouseholdCursor = useCallback(
    () => householdCursorRef.current,
    [householdCursorRef],
  );

  const { scheduleSync } = useHouseholdSync({
    householdId,
    enabled: isHousehold,
    getCursor: getHouseholdCursor,
    onMessages: batch => mergeBatch(batch),
  });

  const handleRealtimeStatus = useCallback(
    (status: string) => {
      if (
        status === 'SUBSCRIBED' &&
        statusRef.current &&
        errorStatuses.current.has(statusRef.current)
      ) {
        scheduleSync('resubscribed');
      }
      statusRef.current = status;
    },
    [scheduleSync],
  );

  useHouseholdRealtime({
    householdId,
    isHousehold,
    onMessage: mergeRealtime,
    onStatus: handleRealtimeStatus,
  });

  useEffect(() => {
    if (!isHousehold) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleSync('visibility');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isHousehold, scheduleSync]);

  const handleSend = useCallback(
    async (content: string) => {
      const { tempId } = addOptimistic(content);
      const result = await sendChatMessage({
        content,
        householdId: isHousehold ? householdId : null,
      });

      if (result?.errorCode || !result.message) {
        markFailed(tempId);
        return;
      }

      reconcile(tempId, result.message);
    },
    [addOptimistic, householdId, isHousehold, markFailed, reconcile],
  );

  const loadOlderPersonal = useCallback(async () => {
    if (isLoadingMorePersonal || !personalHasMore) return;
    const oldest = personalMessages[0];
    if (!oldest) {
      setPersonalHasMore(false);
      return;
    }
    setIsLoadingMorePersonal(true);
    try {
      const batch = await fetchChatHistory({
        householdId: null,
        cursor: { created_at: oldest.created_at, id: oldest.id },
        limit: HISTORY_PAGE_SIZE,
      });
      if (!batch.length) {
        setPersonalHasMore(false);
        return;
      }
      mergePersonalBatch(batch);
      if (batch.length < HISTORY_PAGE_SIZE) {
        setPersonalHasMore(false);
      }
    } catch (err) {
      console.warn('[chat] personal history failed', err);
    } finally {
      setIsLoadingMorePersonal(false);
    }
  }, [
    isLoadingMorePersonal,
    mergePersonalBatch,
    personalHasMore,
    personalMessages,
  ]);

  const loadOlderHousehold = useCallback(async () => {
    if (isLoadingMoreHousehold || !householdHasMore || !householdId) return;
    const oldest = householdMessages[0];
    if (!oldest) {
      setHouseholdHasMore(false);
      return;
    }
    setIsLoadingMoreHousehold(true);
    try {
      const batch = await fetchChatHistory({
        householdId,
        cursor: { created_at: oldest.created_at, id: oldest.id },
        limit: HISTORY_PAGE_SIZE,
      });
      if (!batch.length) {
        setHouseholdHasMore(false);
        return;
      }
      mergeBatch(batch);
      if (batch.length < HISTORY_PAGE_SIZE) {
        setHouseholdHasMore(false);
      }
    } catch (err) {
      console.warn('[chat] household history failed', err);
    } finally {
      setIsLoadingMoreHousehold(false);
    }
  }, [
    householdHasMore,
    householdId,
    householdMessages,
    isLoadingMoreHousehold,
    mergeBatch,
  ]);

  const { draft, setDraft, handleKeyDown, handleSubmit } = useComposer({
    onSend: handleSend,
  });

  return (
    <Panel marginBottom={2} className={styles['momo-chat']}>
      <Flex
        isFullHeight
        isFullWidth
        direction="column"
        justifyContent="space-between"
        style={{ minHeight: 0 }}
      >
        <ChatToggle
          active={activeTab}
          onChange={setActiveTab}
          householdName={householdName}
          showHousehold={Boolean(householdId)}
        />
        <Divider thickness="thick" />
        <FlexItem
          grow={1}
          padding={0}
          className="full-w"
          style={{ minHeight: 0 }}
        >
          <ChatList
            messages={messages}
            hasMore={isHousehold ? householdHasMore : personalHasMore}
            isLoadingMore={
              isHousehold ? isLoadingMoreHousehold : isLoadingMorePersonal
            }
            onLoadMore={isHousehold ? loadOlderHousehold : loadOlderPersonal}
            currentUserId={userId}
            renderMessage={msg => (
              <ChatMessageItem
                key={msg.id}
                message={msg.content}
                isOwn={msg.user_id === userId}
                senderName={
                  isHousehold && msg.user_id !== userId
                    ? (msg.sender_name ?? null)
                    : null
                }
                showAvatar={isHousehold && msg.user_id !== userId}
                timestamp={format(new Date(msg.created_at), 'p')}
              />
            )}
          />
        </FlexItem>
        <Divider thickness="thick" />
        <Flex
          as="form"
          paddingX={1}
          paddingY={2}
          isFullWidth
          gap={1}
          onSubmit={handleSubmit}
        >
          <Input
            multiline
            autoResize
            minRows={1}
            maxRows={3}
            value={draft}
            onChange={(
              event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
            ) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            suffix={<SendButton />}
          />
        </Flex>
      </Flex>
    </Panel>
  );
}
