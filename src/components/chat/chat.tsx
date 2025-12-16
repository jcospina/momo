'use client';

import { useCallback, useEffect, useRef } from 'react';

import { sendChatMessage } from '@actions/chat-messages';
import { ChatMessage as ChatMessageItem } from '@components/chat/chat-message';
import { SendButton } from '@components/chat/send-button';
import { ChatToggle } from '@components/chat/toggle/chat-toggle';
import { useChatState } from '@features/chat/hooks/use-chat-state';
import { useComposer } from '@features/chat/hooks/use-composer';
import { useHouseholdRealtime } from '@features/chat/hooks/use-household-realtime';
import { useHouseholdSync } from '@features/chat/hooks/use-household-sync';
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
    householdCursorRef,
  } = useChatState({
    userId,
    householdId,
    initialPersonalMessages,
    initialHouseholdMessages,
  });

  const statusRef = useRef<string | null>(null);
  const errorStatuses = useRef(
    new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']),
  );

  const getHouseholdCursor = useCallback(
    () => householdCursorRef.current,
    [householdCursorRef],
  );

  const handleCatchupMessages = useCallback(
    (batch: ChatMessage[]) => {
      batch.forEach(mergeRealtime);
    },
    [mergeRealtime],
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
            hasMore={false}
            isLoadingMore={false}
            onLoadMore={() => {}}
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
