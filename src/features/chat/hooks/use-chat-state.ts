'use client';

import { useCallback, useMemo, useState } from 'react';

import type { ChatMessage } from '@lib-types/chat-messages';
import { useHouseholdMessages } from './use-household-messages';

type UseChatStateArgs = {
  userId: string;
  householdId: string | null;
  initialPersonalMessages: ChatMessage[];
  initialHouseholdMessages: ChatMessage[];
};

function createTempId() {
  return `tmp-${Date.now().toString(16)}-${Math.random()
    .toString(16)
    .slice(2)}`;
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
        expense_id: null,
        created_at: new Date().toISOString(),
        sender_name: null,
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

  const reconcile = useCallback(
    (tempId: string, message: ChatMessage) => {
      updateHouseholdCursor(message);
      if (isHousehold) {
        setHouseholdMessages(prev => {
          const filtered = prev.filter(
            m => m.id !== tempId && m.id !== message.id,
          );
          return [...filtered, message];
        });
      } else {
        setPersonalMessages(prev => {
          const filtered = prev.filter(
            m => m.id !== tempId && m.id !== message.id,
          );
          return [...filtered, message];
        });
      }
    },
    [isHousehold, setHouseholdMessages, updateHouseholdCursor],
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
    reconcile,
    mergeRealtime,
    mergeBatch,
    mergePersonalBatch,
    personalMessages,
    householdMessages,
    householdCursorRef,
  };
}
