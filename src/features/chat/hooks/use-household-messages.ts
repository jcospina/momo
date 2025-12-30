'use client';

import { useCallback, useRef, useState } from 'react';

import type { ChatMessage } from '@lib-types/chat';
import type { ChatCursor } from '@lib-types/chat';

type UseHouseholdMessagesArgs = {
  initialHouseholdMessages: ChatMessage[];
};

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
        const exists = prev.some(m => m.id === incoming.id);
        if (exists) {
          return prev.map(m => (m.id === incoming.id ? incoming : m));
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
