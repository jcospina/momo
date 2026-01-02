'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { deleteChatMessage, sendChatMessage } from '@actions/chat-messages';
import { ChatMessage as ChatMessageItem } from '@components/chat/chat-message';
import { SendButton } from '@components/chat/send-button';
import { ChatToggle } from '@components/chat/toggle/chat-toggle';
import { ExpenseDetailsDialog } from '@components/expense-details/expense-details-dialog';
import { fetchChatHistory } from '@features/chat/api/chat-history';
import { useChatState } from '@features/chat/hooks/use-chat-state';
import { useComposer } from '@features/chat/hooks/use-composer';
import { useHouseholdRealtime } from '@features/chat/hooks/use-household-realtime';
import { useHouseholdSync } from '@features/chat/hooks/use-household-sync';
import type { ChatMessage } from '@lib-types/chat';
import { useDialogController } from '@ui/dialog/dialog';
import { Divider } from '@ui/divider/divider';
import { FlexItem } from '@ui/flex-item/flex-item';
import { Flex } from '@ui/flex/flex';
import { Input } from '@ui/input/input';
import { Panel } from '@ui/panel/panel';
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
    markPending,
    reconcile,
    mergeRealtime,
    mergeBatch,
    mergePersonalBatch,
    householdCursorRef,
    personalMessages,
    householdMessages,
    removeHouseholdMessage,
    removePersonalMessage,
  } = useChatState({
    userId,
    householdId,
    initialPersonalMessages,
    initialHouseholdMessages,
  });

  const [isLoadingMorePersonal, setIsLoadingMorePersonal] = useState(false);
  const [isLoadingMoreHousehold, setIsLoadingMoreHousehold] = useState(false);
  const [expenseDetailsMessageId, setExpenseDetailsMessageId] = useState<
    string | null
  >(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, boolean>>({});
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

  const handleSyncMessages = useCallback(
    (batch: ChatMessage[]) => {
      mergeBatch(batch);
    },
    [mergeBatch],
  );

  const { scheduleSync } = useHouseholdSync({
    householdId,
    enabled: isHousehold,
    getCursor: getHouseholdCursor,
    onMessages: handleSyncMessages,
  });

  const expenseDetailsDialog = useDialogController();

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
    onDelete: message => removeHouseholdMessage(message.id),
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

  const handleRetrySend = useCallback(
    async (message: ChatMessage) => {
      if (!message.id.startsWith('tmp-')) return;
      markPending(message.id);
      const result = await sendChatMessage({
        content: message.content,
        householdId: message.household_id ?? null,
      });

      if (result?.errorCode || !result.message) {
        markFailed(message.id);
        return;
      }

      reconcile(message.id, result.message);
    },
    [markFailed, markPending, reconcile],
  );

  const handleOpenExpenseDetails = useCallback(
    (message: ChatMessage) => {
      setExpenseDetailsMessageId(message.id);
      expenseDetailsDialog.openDialog();
    },
    [expenseDetailsDialog],
  );

  const handleDeleteMessage = useCallback(
    async (message: ChatMessage) => {
      if (message.household_id) {
        removeHouseholdMessage(message.id);
      } else {
        removePersonalMessage(message.id);
      }
      setDeleteErrors(prev => {
        if (!prev[message.id]) return prev;
        const next = { ...prev };
        delete next[message.id];
        return next;
      });
      const result = await deleteChatMessage({ messageId: message.id });
      if (result?.errorCode) {
        console.warn('[chat] delete failed', {
          id: message.id,
          error: result.errorCode,
        });
        if (message.household_id) {
          mergeBatch([message]);
        } else {
          mergePersonalBatch([message]);
        }
        setDeleteErrors(prev => ({ ...prev, [message.id]: true }));
        return;
      }
    },
    [
      mergeBatch,
      mergePersonalBatch,
      removeHouseholdMessage,
      removePersonalMessage,
    ],
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
    <>
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
                  message={msg}
                  currentUserId={userId}
                  isHousehold={isHousehold}
                  onDelete={handleDeleteMessage}
                  onRetrySend={handleRetrySend}
                  onOpenExpenseDetails={handleOpenExpenseDetails}
                  deleteError={Boolean(deleteErrors[msg.id])}
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
                event: React.ChangeEvent<
                  HTMLTextAreaElement | HTMLInputElement
                >,
              ) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              suffix={<SendButton />}
            />
          </Flex>
        </Flex>
      </Panel>
      <ExpenseDetailsDialog
        controller={expenseDetailsDialog}
        messageId={expenseDetailsMessageId}
      />
    </>
  );
}
