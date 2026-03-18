'use client';

import type { ChatCursor, ChatMessage } from '@lib-types/chat';
import { useCallback, useRef, useState } from 'react';

type UseHouseholdMessagesArgs = {
  initialHouseholdMessages: ChatMessage[];
};

const OPTIMISTIC_MATCH_WINDOW_MS = 10_000;

function findOptimisticMatchIndex(
  messages: ChatMessage[],
  incoming: ChatMessage,
) {
  if (incoming.id.startsWith('tmp-')) return -1;
  const incomingTime = Date.parse(incoming.created_at);
  if (Number.isNaN(incomingTime)) return -1;
  let bestIndex = -1;
  let bestDelta = Number.POSITIVE_INFINITY;

  messages.forEach((message, index) => {
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
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function useHouseholdMessages({
  initialHouseholdMessages,
}: UseHouseholdMessagesArgs) {
  const initialCursor =
    initialHouseholdMessages.length > 0
      ? {
          created_at:
            initialHouseholdMessages[initialHouseholdMessages.length - 1]
              .created_at,
          id: initialHouseholdMessages[initialHouseholdMessages.length - 1].id,
        }
      : null;

  const [householdMessages, setHouseholdMessages] = useState<ChatMessage[]>(
    initialHouseholdMessages,
  );
  const householdCursorRef = useRef<ChatCursor | null>(initialCursor);

  const updateHouseholdCursor = useCallback((message: ChatMessage) => {
    if (!message.household_id) return;
    const current = householdCursorRef.current;
    if (
      !current ||
      message.created_at > current.created_at ||
      (message.created_at === current.created_at && message.id > current.id)
    ) {
      householdCursorRef.current = {
        created_at: message.created_at,
        id: message.id,
      };
    }
  }, []);

  const mergeRealtime = useCallback(
    (incoming: ChatMessage) => {
      updateHouseholdCursor(incoming);
      setHouseholdMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === incoming.id);
        if (existingIndex >= 0) {
          const next = prev.slice();
          next[existingIndex] = incoming;
          return next;
        }
        const optimisticIndex = findOptimisticMatchIndex(prev, incoming);
        if (optimisticIndex >= 0) {
          const next = prev.slice();
          next[optimisticIndex] = incoming;
          return next;
        }
        return [...prev, incoming];
      });
    },
    [updateHouseholdCursor],
  );

  const mergeBatch = useCallback(
    (incoming: ChatMessage[]) => {
      if (!incoming?.length) return;
      setHouseholdMessages(prev => {
        const byId = new Map<string, ChatMessage>();
        prev.forEach(m => {
          byId.set(m.id, m);
        });
        incoming.forEach(msg => {
          updateHouseholdCursor(msg);
          byId.set(msg.id, msg);
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
    },
    [updateHouseholdCursor],
  );

  const removeHouseholdMessage = useCallback((messageId: string) => {
    setHouseholdMessages(prev =>
      prev.filter(message => message.id !== messageId),
    );
  }, []);

  return {
    householdMessages,
    setHouseholdMessages,
    householdCursorRef,
    updateHouseholdCursor,
    mergeRealtime,
    mergeBatch,
    removeHouseholdMessage,
  };
}
