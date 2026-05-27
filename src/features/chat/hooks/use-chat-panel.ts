'use client';

import type { MomoStreamState } from '@hooks/use-momo-stream';
import { useMomoStream } from '@hooks/use-momo-stream';
import type { ChatMessage, SyncReason } from '@lib-types/chat';
import { useDialogController } from '@ui/dialog/dialog';
import { momoIdempotencyKey } from '@utils/momo-mention';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getList as getChatHistory,
  remove as removeChatMessage,
  send as sendChatMessage,
} from '@/lib/data/messages/client';
import { useChatState } from './use-chat-state';
import { useComposer } from './use-composer';
import { useHouseholdRealtime } from './use-household-realtime';
import { useHouseholdSync } from './use-household-sync';
import { usePersonalRealtime } from './use-personal-realtime';
import { usePersonalSync } from './use-personal-sync';

const HISTORY_PAGE_SIZE = 30;
const REALTIME_ERROR_STATUSES = new Set([
  'CHANNEL_ERROR',
  'TIMED_OUT',
  'CLOSED',
]);

type ChatScope = 'personal' | 'household';

type UseChatPanelArgs = {
  scope: ChatScope;
  userId: string;
  householdId: string | null;
  initialMessages: ChatMessage[];
  isActive: boolean;
};

type ExpenseDetailsSaved = {
  messageId: string;
  status: 'processed' | 'needs_category';
};

// Resyncs whenever realtime returns from an error state to SUBSCRIBED — covers
// messages that arrived while the channel was down.
function useResyncOnResubscribe(scheduleSync: (reason: SyncReason) => void) {
  const statusRef = useRef<string | null>(null);
  return useCallback(
    (status: string) => {
      if (
        status === 'SUBSCRIBED' &&
        statusRef.current &&
        REALTIME_ERROR_STATUSES.has(statusRef.current)
      ) {
        scheduleSync('resubscribed');
      }
      statusRef.current = status;
    },
    [scheduleSync],
  );
}

export function useChatPanel({
  scope,
  userId,
  householdId,
  initialMessages,
  isActive,
}: UseChatPanelArgs) {
  const isHousehold = scope === 'household';
  // The household id only applies to the household scope; personal panels
  // always send/load with null even if a household exists in the wider app.
  const effectiveHouseholdId = isHousehold ? householdId : null;
  const hasUsableScope = isHousehold ? Boolean(householdId) : true;

  // Owns the lifecycle for every in-flight @momo stream in this panel. Keys
  // are `triggeringMessageId`s so multiple @momo mentions can run in parallel
  // and resolve independently.
  const { start: startMomoStream, streams: momoStreams } = useMomoStream();

  const {
    messages,
    addOptimistic,
    markFailed,
    markPending,
    reconcile,
    mergeRealtime,
    mergeBatch,
    mergePersonalBatch,
    householdCursorRef,
    householdMessages,
    personalMessages,
    removeHouseholdMessage,
    removePersonalMessage,
    setMessageStatus,
  } = useChatState({
    userId,
    householdId: effectiveHouseholdId,
    initialPersonalMessages: isHousehold ? [] : initialMessages,
    initialHouseholdMessages: isHousehold ? initialMessages : [],
  });

  const mergeFromSync = isHousehold ? mergeBatch : mergePersonalBatch;
  const removeMessage = isHousehold
    ? removeHouseholdMessage
    : removePersonalMessage;
  const scopedMessages = isHousehold ? householdMessages : personalMessages;

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expenseDetailsMessageId, setExpenseDetailsMessageId] = useState<
    string | null
  >(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, boolean>>({});
  const [hasMore, setHasMore] = useState(
    hasUsableScope && initialMessages.length >= HISTORY_PAGE_SIZE,
  );
  const expenseDetailsDialog = useDialogController();

  // Both sync hooks mount unconditionally (rules-of-hooks) and gate work via
  // `enabled`. Only one of them is the active source of `scheduleSync`.
  const getHouseholdCursor = useCallback(
    () => householdCursorRef.current,
    [householdCursorRef],
  );

  const personalSync = usePersonalSync({
    userId,
    enabled: isActive && !isHousehold,
    onMessages: mergeFromSync,
  });
  const householdSync = useHouseholdSync({
    householdId: effectiveHouseholdId,
    enabled: isActive && isHousehold,
    getCursor: getHouseholdCursor,
    onMessages: mergeFromSync,
  });
  const scheduleSync = isHousehold
    ? householdSync.scheduleSync
    : personalSync.scheduleSync;

  const handleRealtimeStatus = useResyncOnResubscribe(scheduleSync);

  // Personal realtime feeds the batch merger (one message at a time);
  // household realtime feeds the cursor-aware merger.
  const handlePersonalRealtimeMessage = useCallback(
    (message: ChatMessage) => {
      mergePersonalBatch([message]);
    },
    [mergePersonalBatch],
  );
  const handlePersonalRealtimeDelete = useCallback(
    (message: ChatMessage) => {
      removePersonalMessage(message.id);
    },
    [removePersonalMessage],
  );
  const handleHouseholdRealtimeDelete = useCallback(
    (message: ChatMessage) => {
      removeHouseholdMessage(message.id);
    },
    [removeHouseholdMessage],
  );

  usePersonalRealtime({
    userId,
    isPersonal: isActive && !isHousehold,
    onMessage: handlePersonalRealtimeMessage,
    onDelete: handlePersonalRealtimeDelete,
    onStatus: handleRealtimeStatus,
  });
  useHouseholdRealtime({
    householdId: effectiveHouseholdId,
    isHousehold: isActive && isHousehold && Boolean(householdId),
    onMessage: mergeRealtime,
    onDelete: handleHouseholdRealtimeDelete,
    onStatus: handleRealtimeStatus,
  });

  useEffect(() => {
    if (!isActive || !hasUsableScope) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleSync('visibility');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasUsableScope, isActive, scheduleSync]);

  // Personal-only: realtime sometimes drops the processed update, so re-sync
  // after 6s if any server-side message is still pending.
  useEffect(() => {
    if (!isActive || isHousehold) return;
    const hasPendingServer = personalMessages.some(
      message => message.status === 'pending' && !message.id.startsWith('tmp-'),
    );
    if (!hasPendingServer) return;
    const timer = setTimeout(() => {
      scheduleSync('pending');
    }, 6_000);
    return () => clearTimeout(timer);
  }, [isActive, isHousehold, personalMessages, scheduleSync]);

  // Server-side detection of `@momo` is signalled by `momo_invocation_tagged`
  // on the persisted row. When set, fire the streaming agent — the full
  // content (including the @momo token) is forwarded; the agent prompt
  // handles the mention.
  const maybeStartMomoStream = useCallback(
    (message: ChatMessage) => {
      if (!message.momo_invocation_tagged) return;
      startMomoStream({
        content: message.content,
        householdId: effectiveHouseholdId,
        triggeringMessageId: message.id,
      });
    },
    [effectiveHouseholdId, startMomoStream],
  );

  const handleSend = useCallback(
    async (content: string) => {
      const { tempId } = addOptimistic(content);
      const result = await sendChatMessage({
        content,
        householdId: effectiveHouseholdId,
      });
      if (result?.errorCode || !result.message) {
        markFailed(tempId);
        return;
      }
      reconcile(tempId, result.message);
      maybeStartMomoStream(result.message);
    },
    [
      addOptimistic,
      effectiveHouseholdId,
      markFailed,
      maybeStartMomoStream,
      reconcile,
    ],
  );

  const handleRetrySend = useCallback(
    async (message: ChatMessage) => {
      if (!message.id.startsWith('tmp-')) return;
      markPending(message.id);
      const result = await sendChatMessage({
        content: message.content,
        householdId: effectiveHouseholdId,
      });
      if (result?.errorCode || !result.message) {
        markFailed(message.id);
        return;
      }
      reconcile(message.id, result.message);
      maybeStartMomoStream(result.message);
    },
    [
      effectiveHouseholdId,
      markFailed,
      markPending,
      maybeStartMomoStream,
      reconcile,
    ],
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
      removeMessage(message.id);
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
        mergeFromSync([message]);
        setDeleteErrors(prev => ({ ...prev, [message.id]: true }));
      }
    },
    [mergeFromSync, removeMessage],
  );

  const handleExpenseDetailsSaved = useCallback(
    ({ messageId, status }: ExpenseDetailsSaved) => {
      setMessageStatus(messageId, status);
      scheduleSync('pending');
    },
    [scheduleSync, setMessageStatus],
  );

  const loadOlder = useCallback(async () => {
    if (isLoadingMore || !hasMore || !hasUsableScope) return;
    const oldest = scopedMessages[0];
    if (!oldest) {
      setHasMore(false);
      return;
    }
    setIsLoadingMore(true);
    try {
      const batch = await getChatHistory({
        householdId: effectiveHouseholdId,
        cursor: { created_at: oldest.created_at, id: oldest.id },
        limit: HISTORY_PAGE_SIZE,
      });
      if (!batch.length) {
        setHasMore(false);
        return;
      }
      mergeFromSync(batch);
      if (batch.length < HISTORY_PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.warn(`[chat] ${scope} history failed`, err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    effectiveHouseholdId,
    hasMore,
    hasUsableScope,
    isLoadingMore,
    mergeFromSync,
    scope,
    scopedMessages,
  ]);

  const composer = useComposer({ onSend: handleSend });

  // Filter out streams whose persisted MoMo reply has already landed via
  // realtime / sync. Once the row is in `messages`, the chat-message renderer
  // owns the bubble and the streaming UI must disappear.
  const pendingStreams = useMemo<ReadonlyMap<string, MomoStreamState>>(() => {
    if (momoStreams.size === 0) return EMPTY_STREAMS;
    const persistedKeys = new Set<string>();
    for (const message of messages) {
      if (message.idempotency_key) persistedKeys.add(message.idempotency_key);
    }
    const next = new Map<string, MomoStreamState>();
    for (const [triggeringMessageId, state] of momoStreams) {
      if (persistedKeys.has(momoIdempotencyKey(triggeringMessageId))) continue;
      next.set(triggeringMessageId, state);
    }
    return next;
  }, [messages, momoStreams]);

  return {
    messages,
    isHousehold,
    hasMore,
    isLoadingMore,
    loadOlder,
    onDelete: handleDeleteMessage,
    onRetrySend: handleRetrySend,
    onOpenExpenseDetails: handleOpenExpenseDetails,
    deleteErrors,
    draft: composer.draft,
    setDraft: composer.setDraft,
    handleKeyDown: composer.handleKeyDown,
    handleSubmit: composer.handleSubmit,
    expenseDetailsDialog,
    expenseDetailsMessageId,
    onExpenseDetailsSaved: handleExpenseDetailsSaved,
    pendingStreams,
  };
}

const EMPTY_STREAMS: ReadonlyMap<string, MomoStreamState> = new Map();

export type UseChatPanelReturn = ReturnType<typeof useChatPanel>;
