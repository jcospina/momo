'use client';

import type { ChatCursor, ChatMessage } from '@lib-types/chat';
import { useCallback, useMemo, useState } from 'react';
import { useHouseholdMessages } from './use-household-messages';

type UseChatStateArgs = {
  userId: string;
  householdId: string | null;
  initialPersonalMessages: ChatMessage[];
  initialHouseholdMessages: ChatMessage[];
};

const OPTIMISTIC_MATCH_WINDOW_MS = 10_000;

function findOptimisticMatchId(messages: ChatMessage[], incoming: ChatMessage) {
  if (incoming.id.startsWith('tmp-')) return null;
  const incomingTime = Date.parse(incoming.created_at);
  if (Number.isNaN(incomingTime)) return null;
  let bestId: string | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  messages.forEach(message => {
    if (!message.id.startsWith('tmp-')) return;
    if (message.status !== 'pending') return;
    if (message.user_id !== incoming.user_id) return;
    if (message.household_id !== incoming.household_id) return;
    if (message.content.trim() !== incoming.content.trim()) return;
    const messageTime = Date.parse(message.created_at);
    if (Number.isNaN(messageTime)) return;
    const delta = Math.abs(incomingTime - messageTime);
    if (delta <= OPTIMISTIC_MATCH_WINDOW_MS && delta < bestDelta) {
      bestDelta = delta;
      bestId = message.id;
    }
  });

  return bestId;
}

function createTempId() {
  return `tmp-${Date.now().toString(16)}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function compareMessageOrder(a: ChatMessage, b: ChatMessage) {
  if (a.created_at === b.created_at) {
    return a.id.localeCompare(b.id);
  }
  return a.created_at.localeCompare(b.created_at);
}

function isAfter(cursor: ChatCursor | null, message: ChatMessage) {
  if (!cursor) return false;
  return (
    message.created_at > cursor.created_at ||
    (message.created_at === cursor.created_at && message.id > cursor.id)
  );
}

function insertSorted(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  let left = 0;
  let right = messages.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (compareMessageOrder(messages[mid], message) <= 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  const next = messages.slice();
  next.splice(left, 0, message);
  return next;
}

export function useChatState({
  userId,
  householdId,
  initialPersonalMessages,
  initialHouseholdMessages,
}: UseChatStateArgs) {
  const [activeTab, setActiveTab] = useState<'personal' | 'household'>(
    householdId ? 'household' : 'personal',
  );

  const [personalMessages, setPersonalMessages] = useState<ChatMessage[]>(
    initialPersonalMessages,
  );
  const {
    householdMessages,
    setHouseholdMessages,
    householdCursorRef,
    updateHouseholdCursor,
    mergeRealtime,
    mergeBatch,
    removeHouseholdMessage,
  } = useHouseholdMessages({ initialHouseholdMessages });

  const isHousehold = activeTab === 'household' && Boolean(householdId);

  const messages = useMemo(
    () => (isHousehold ? householdMessages : personalMessages),
    [householdMessages, isHousehold, personalMessages],
  );

  const addOptimistic = useCallback(
    (content: string): { tempId: string } => {
      const tempId = createTempId();
      const optimistic: ChatMessage = {
        id: tempId,
        household_id: isHousehold ? householdId : null,
        user_id: userId,
        content,
        status: 'pending',
        expense_count: 0,
        created_at: new Date().toISOString(),
        sender_name: null,
        author_kind: 'user',
        momo_source: null,
        momo_invocation_tagged: false,
        idempotency_key: null,
      };
      if (isHousehold) {
        setHouseholdMessages(prev => [...prev, optimistic]);
      } else {
        setPersonalMessages(prev => [...prev, optimistic]);
      }
      return { tempId };
    },
    [householdId, isHousehold, setHouseholdMessages, userId],
  );

  const mergePersonalBatch = useCallback((incoming: ChatMessage[]) => {
    if (!incoming?.length) return;
    setPersonalMessages(prev => {
      const byId = new Map<string, ChatMessage>();
      prev.forEach(message => {
        byId.set(message.id, message);
      });
      incoming.forEach(message => {
        if (!byId.has(message.id)) {
          const optimisticId = findOptimisticMatchId(prev, message);
          if (optimisticId) {
            byId.delete(optimisticId);
          }
        }
        byId.set(message.id, message);
      });
      const merged = Array.from(byId.values());
      merged.sort((a, b) => {
        if (a.created_at === b.created_at) {
          return a.id.localeCompare(b.id);
        }
        return a.created_at.localeCompare(b.created_at);
      });
      return merged;
    });
  }, []);

  const removePersonalMessage = useCallback((messageId: string) => {
    setPersonalMessages(prev =>
      prev.filter(message => message.id !== messageId),
    );
  }, []);

  const markFailed = useCallback(
    (tempId: string) => {
      if (isHousehold) {
        setHouseholdMessages(prev =>
          prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)),
        );
      } else {
        setPersonalMessages(prev =>
          prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m)),
        );
      }
    },
    [isHousehold, setHouseholdMessages],
  );

  const markPending = useCallback(
    (tempId: string) => {
      if (isHousehold) {
        setHouseholdMessages(prev =>
          prev.map(m => (m.id === tempId ? { ...m, status: 'pending' } : m)),
        );
      } else {
        setPersonalMessages(prev =>
          prev.map(m => (m.id === tempId ? { ...m, status: 'pending' } : m)),
        );
      }
    },
    [isHousehold, setHouseholdMessages],
  );

  const setMessageStatus = useCallback(
    (
      messageId: string,
      status: Extract<ChatMessage['status'], 'processed' | 'needs_category'>,
    ) => {
      if (isHousehold) {
        setHouseholdMessages(prev =>
          prev.map(message =>
            message.id === messageId ? { ...message, status } : message,
          ),
        );
        return;
      }

      setPersonalMessages(prev =>
        prev.map(message =>
          message.id === messageId ? { ...message, status } : message,
        ),
      );
    },
    [isHousehold, setHouseholdMessages],
  );

  const reconcile = useCallback(
    (tempId: string, message: ChatMessage) => {
      if (isHousehold) {
        setHouseholdMessages(prev => {
          const tempIndex = prev.findIndex(m => m.id === tempId);
          const existingIndex = prev.findIndex(m => m.id === message.id);
          if (existingIndex >= 0) {
            const next = prev.slice();
            next[existingIndex] = message;
            if (tempIndex >= 0 && tempIndex !== existingIndex) {
              next.splice(tempIndex, 1);
            }
            if (isAfter(householdCursorRef.current, message)) {
              updateHouseholdCursor(message);
            }
            return next;
          }
          if (tempIndex >= 0) {
            const next = prev.slice();
            next[tempIndex] = message;
            if (isAfter(householdCursorRef.current, message)) {
              updateHouseholdCursor(message);
            }
            return next;
          }
          const next = insertSorted(prev, message);
          if (isAfter(householdCursorRef.current, message)) {
            updateHouseholdCursor(message);
          }
          return next;
        });
      } else {
        setPersonalMessages(prev => {
          const tempIndex = prev.findIndex(m => m.id === tempId);
          const existingIndex = prev.findIndex(m => m.id === message.id);
          if (existingIndex >= 0) {
            const next = prev.slice();
            next[existingIndex] = message;
            if (tempIndex >= 0 && tempIndex !== existingIndex) {
              next.splice(tempIndex, 1);
            }
            return next;
          }
          if (tempIndex >= 0) {
            const next = prev.slice();
            next[tempIndex] = message;
            return next;
          }
          return insertSorted(prev, message);
        });
      }
    },
    [
      householdCursorRef,
      isHousehold,
      setHouseholdMessages,
      updateHouseholdCursor,
    ],
  );

  const setActiveTabSafe = useCallback(
    (next: 'personal' | 'household') => {
      if (next === 'household' && !householdId) return;
      setActiveTab(next);
    },
    [householdId],
  );

  return {
    activeTab,
    setActiveTab: setActiveTabSafe,
    isHousehold,
    messages,
    addOptimistic,
    markFailed,
    markPending,
    setMessageStatus,
    reconcile,
    mergeRealtime,
    mergeBatch,
    mergePersonalBatch,
    removeHouseholdMessage,
    removePersonalMessage,
    personalMessages,
    householdMessages,
    householdCursorRef,
  };
}
