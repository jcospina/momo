'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getList as getChatHistory,
  remove as removeChatMessage,
  send as sendChatMessage,
} from '@/lib/data/messages/client';
import { ChatMessage as ChatMessageItem } from '@components/chat/chat-message';
import { SendButton } from '@components/chat/send-button';
import { ChatToggle } from '@components/chat/toggle/chat-toggle';
import { ExpenseDetailsDialog } from '@components/expense-details/expense-details-dialog';
import { useChatState } from '@features/chat/hooks/use-chat-state';
import { useComposer } from '@features/chat/hooks/use-composer';
import { useHouseholdRealtime } from '@features/chat/hooks/use-household-realtime';
import { useHouseholdSync } from '@features/chat/hooks/use-household-sync';
import { usePersonalRealtime } from '@features/chat/hooks/use-personal-realtime';
import { usePersonalSync } from '@features/chat/hooks/use-personal-sync';
import type { ChatMessage } from '@lib-types/chat';
import { useDialogController } from '@ui/dialog/dialog';
import { Divider } from '@ui/divider/divider';
import { FlexItem } from '@ui/flex-item/flex-item';
import { Flex } from '@ui/flex/flex';
import { Input } from '@ui/input/input';
import { Panel } from '@ui/panel/panel';
import { format, getYear, isToday, isYesterday } from 'date-fns';

import { ChatDateSeparator } from './chat-date-separator';
import { ChatList } from './chat-list';

import styles from './chat.module.css';

interface ChatProps {
  householdName?: string;
  householdId?: string | null;
  userId: string;
  initialPersonalMessages: ChatMessage[];
  initialHouseholdMessages: ChatMessage[];
}

type ChatPanelProps = {
  userId: string;
  isActive: boolean;
  householdId?: string | null;
  initialMessages: ChatMessage[];
};

const HISTORY_PAGE_SIZE = 30;

function formatDateSeparatorLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (getYear(date) === getYear(new Date())) return format(date, 'EEE, MMM d');
  return format(date, 'EEE, MMM d, yyyy');
}

type ChatPanelLayoutProps = {
  isActive: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  currentUserId: string;
  isHousehold: boolean;
  onDelete: (message: ChatMessage) => void;
  onRetrySend: (message: ChatMessage) => void;
  onOpenExpenseDetails: (message: ChatMessage) => void;
  deleteErrors: Record<string, boolean>;
  draft: string;
  setDraft: (value: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  expenseDetailsDialog: ReturnType<typeof useDialogController>;
  expenseDetailsMessageId: string | null;
};

function ChatPanelLayout({
  isActive,
  messages,
  hasMore,
  isLoadingMore,
  onLoadMore,
  currentUserId,
  isHousehold,
  onDelete,
  onRetrySend,
  onOpenExpenseDetails,
  deleteErrors,
  draft,
  setDraft,
  onKeyDown,
  onSubmit,
  expenseDetailsDialog,
  expenseDetailsMessageId,
}: ChatPanelLayoutProps) {
  return (
    <Flex
      direction="column"
      isFullWidth
      isFullHeight
      style={{ display: isActive ? 'flex' : 'none', minHeight: 0 }}
    >
      <FlexItem
        grow={1}
        padding={0}
        className="full-w"
        style={{ minHeight: 0 }}
      >
        <ChatList
          messages={messages}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          currentUserId={currentUserId}
          renderMessage={(msg, prevMsg) => {
            const msgDate = new Date(msg.created_at);
            const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
            const showSeparator =
              !prevDate || msgDate.toDateString() !== prevDate.toDateString();
            return (
              <Flex direction="column" isFullWidth>
                {showSeparator && (
                  <ChatDateSeparator
                    label={formatDateSeparatorLabel(msgDate)}
                  />
                )}
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  isHousehold={isHousehold}
                  onDelete={onDelete}
                  onRetrySend={onRetrySend}
                  onOpenExpenseDetails={onOpenExpenseDetails}
                  deleteError={Boolean(deleteErrors[msg.id])}
                />
              </Flex>
            );
          }}
        />
      </FlexItem>
      <Divider thickness="thick" />
      <Flex
        as="form"
        paddingX={1}
        paddingY={2}
        isFullWidth
        gap={1}
        onSubmit={onSubmit}
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
          onKeyDown={onKeyDown}
          suffix={<SendButton />}
        />
      </Flex>
      <ExpenseDetailsDialog
        controller={expenseDetailsDialog}
        messageId={expenseDetailsMessageId}
      />
    </Flex>
  );
}

function PersonalChatPanel({
  userId,
  isActive,
  initialMessages,
}: ChatPanelProps) {
  const {
    messages,
    addOptimistic,
    markFailed,
    markPending,
    reconcile,
    mergePersonalBatch,
    removePersonalMessage,
    personalMessages,
  } = useChatState({
    userId,
    householdId: null,
    initialPersonalMessages: initialMessages,
    initialHouseholdMessages: [],
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expenseDetailsMessageId, setExpenseDetailsMessageId] = useState<
    string | null
  >(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, boolean>>({});
  const [hasMore, setHasMore] = useState(
    initialMessages.length >= HISTORY_PAGE_SIZE,
  );

  const expenseDetailsDialog = useDialogController();

  const handlePersonalMessage = useCallback(
    (message: ChatMessage) => {
      mergePersonalBatch([message]);
    },
    [mergePersonalBatch],
  );

  const handlePersonalDelete = useCallback(
    (message: ChatMessage) => {
      removePersonalMessage(message.id);
    },
    [removePersonalMessage],
  );

  const statusRef = useRef<string | null>(null);
  const errorStatuses = useRef(
    new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']),
  );

  const handleSyncMessages = useCallback(
    (batch: ChatMessage[]) => {
      mergePersonalBatch(batch);
    },
    [mergePersonalBatch],
  );

  const { scheduleSync } = usePersonalSync({
    userId,
    enabled: isActive,
    onMessages: handleSyncMessages,
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

  usePersonalRealtime({
    userId,
    isPersonal: isActive,
    onMessage: handlePersonalMessage,
    onDelete: handlePersonalDelete,
    onStatus: handleRealtimeStatus,
  });

  useEffect(() => {
    if (!isActive) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleSync('visibility');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isActive, scheduleSync]);

  useEffect(() => {
    if (!isActive) return;
    const hasPendingServer = personalMessages.some(
      message => message.status === 'pending' && !message.id.startsWith('tmp-'),
    );
    if (!hasPendingServer) return;
    const timer = setTimeout(() => {
      scheduleSync('pending');
    }, 6_000);
    return () => clearTimeout(timer);
  }, [isActive, personalMessages, scheduleSync]);

  const handleSend = useCallback(
    async (content: string) => {
      const { tempId } = addOptimistic(content);
      const result = await sendChatMessage({
        content,
        householdId: null,
      });

      if (result?.errorCode || !result.message) {
        markFailed(tempId);
        return;
      }

      reconcile(tempId, result.message);
    },
    [addOptimistic, markFailed, reconcile],
  );

  const handleRetrySend = useCallback(
    async (message: ChatMessage) => {
      if (!message.id.startsWith('tmp-')) return;
      markPending(message.id);
      const result = await sendChatMessage({
        content: message.content,
        householdId: null,
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
      removePersonalMessage(message.id);
      setDeleteErrors(prev => {
        if (!prev[message.id]) return prev;
        const next = { ...prev };
        delete next[message.id];
        return next;
      });
      const result = await removeChatMessage({ messageId: message.id });
      if (result?.errorCode) {
        console.warn('[chat] delete failed', {
          id: message.id,
          error: result.errorCode,
        });
        mergePersonalBatch([message]);
        setDeleteErrors(prev => ({ ...prev, [message.id]: true }));
      }
    },
    [mergePersonalBatch, removePersonalMessage],
  );

  const loadOlder = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const oldest = personalMessages[0];
    if (!oldest) {
      setHasMore(false);
      return;
    }
    setIsLoadingMore(true);
    try {
      const batch = await getChatHistory({
        householdId: null,
        cursor: { created_at: oldest.created_at, id: oldest.id },
        limit: HISTORY_PAGE_SIZE,
      });
      if (!batch.length) {
        setHasMore(false);
        return;
      }
      mergePersonalBatch(batch);
      if (batch.length < HISTORY_PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('[chat] personal history failed', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, mergePersonalBatch, personalMessages]);

  const { draft, setDraft, handleKeyDown, handleSubmit } = useComposer({
    onSend: handleSend,
  });

  return (
    <ChatPanelLayout
      isActive={isActive}
      messages={messages}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadOlder}
      currentUserId={userId}
      isHousehold={false}
      onDelete={handleDeleteMessage}
      onRetrySend={handleRetrySend}
      onOpenExpenseDetails={handleOpenExpenseDetails}
      deleteErrors={deleteErrors}
      draft={draft}
      setDraft={setDraft}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
      expenseDetailsDialog={expenseDetailsDialog}
      expenseDetailsMessageId={expenseDetailsMessageId}
    />
  );
}

function HouseholdChatPanel({
  userId,
  householdId = null,
  isActive,
  initialMessages,
}: ChatPanelProps) {
  const {
    messages,
    addOptimistic,
    markFailed,
    markPending,
    reconcile,
    mergeRealtime,
    mergeBatch,
    householdCursorRef,
    householdMessages,
    removeHouseholdMessage,
  } = useChatState({
    userId,
    householdId,
    initialPersonalMessages: [],
    initialHouseholdMessages: initialMessages,
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expenseDetailsMessageId, setExpenseDetailsMessageId] = useState<
    string | null
  >(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, boolean>>({});
  const [hasMore, setHasMore] = useState(
    Boolean(householdId) && initialMessages.length >= HISTORY_PAGE_SIZE,
  );

  const expenseDetailsDialog = useDialogController();

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
    enabled: isActive,
    getCursor: getHouseholdCursor,
    onMessages: handleSyncMessages,
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

  const handleHouseholdDelete = useCallback(
    (message: ChatMessage) => {
      removeHouseholdMessage(message.id);
    },
    [removeHouseholdMessage],
  );

  useHouseholdRealtime({
    householdId,
    isHousehold: Boolean(householdId) && isActive,
    onMessage: mergeRealtime,
    onDelete: handleHouseholdDelete,
    onStatus: handleRealtimeStatus,
  });

  useEffect(() => {
    if (!isActive) return;
    if (!householdId) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleSync('visibility');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [householdId, isActive, scheduleSync]);

  const handleSend = useCallback(
    async (content: string) => {
      const { tempId } = addOptimistic(content);
      const result = await sendChatMessage({
        content,
        householdId,
      });

      if (result?.errorCode || !result.message) {
        markFailed(tempId);
        return;
      }

      reconcile(tempId, result.message);
    },
    [addOptimistic, householdId, markFailed, reconcile],
  );

  const handleRetrySend = useCallback(
    async (message: ChatMessage) => {
      if (!message.id.startsWith('tmp-')) return;
      markPending(message.id);
      const result = await sendChatMessage({
        content: message.content,
        householdId: householdId ?? null,
      });

      if (result?.errorCode || !result.message) {
        markFailed(message.id);
        return;
      }

      reconcile(message.id, result.message);
    },
    [householdId, markFailed, markPending, reconcile],
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
      removeHouseholdMessage(message.id);
      setDeleteErrors(prev => {
        if (!prev[message.id]) return prev;
        const next = { ...prev };
        delete next[message.id];
        return next;
      });
      const result = await removeChatMessage({ messageId: message.id });
      if (result?.errorCode) {
        console.warn('[chat] delete failed', {
          id: message.id,
          error: result.errorCode,
        });
        mergeBatch([message]);
        setDeleteErrors(prev => ({ ...prev, [message.id]: true }));
      }
    },
    [mergeBatch, removeHouseholdMessage],
  );

  const loadOlder = useCallback(async () => {
    if (isLoadingMore || !hasMore || !householdId) return;
    const oldest = householdMessages[0];
    if (!oldest) {
      setHasMore(false);
      return;
    }
    setIsLoadingMore(true);
    try {
      const batch = await getChatHistory({
        householdId,
        cursor: { created_at: oldest.created_at, id: oldest.id },
        limit: HISTORY_PAGE_SIZE,
      });
      if (!batch.length) {
        setHasMore(false);
        return;
      }
      mergeBatch(batch);
      if (batch.length < HISTORY_PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('[chat] household history failed', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, householdId, householdMessages, isLoadingMore, mergeBatch]);

  const { draft, setDraft, handleKeyDown, handleSubmit } = useComposer({
    onSend: handleSend,
  });

  return (
    <ChatPanelLayout
      isActive={isActive}
      messages={messages}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadOlder}
      currentUserId={userId}
      isHousehold
      onDelete={handleDeleteMessage}
      onRetrySend={handleRetrySend}
      onOpenExpenseDetails={handleOpenExpenseDetails}
      deleteErrors={deleteErrors}
      draft={draft}
      setDraft={setDraft}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
      expenseDetailsDialog={expenseDetailsDialog}
      expenseDetailsMessageId={expenseDetailsMessageId}
    />
  );
}

export function Chat({
  householdName,
  householdId = null,
  userId,
  initialPersonalMessages,
  initialHouseholdMessages,
}: ChatProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'household'>(
    householdId ? 'household' : 'personal',
  );

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
        <HouseholdChatPanel
          userId={userId}
          householdId={householdId}
          isActive={activeTab === 'household'}
          initialMessages={initialHouseholdMessages}
        />
        <PersonalChatPanel
          userId={userId}
          isActive={activeTab === 'personal'}
          initialMessages={initialPersonalMessages}
        />
      </Flex>
    </Panel>
  );
}
