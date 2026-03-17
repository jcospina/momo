'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getSince as getChatSince } from '@/lib/data/messages/client';
import type { ChatMessage, SyncReason } from '@lib-types/chat';
import { SYNC_COOLDOWN_MS, SYNC_PAGE_LIMIT } from '../chat.constants';

type UsePersonalSyncArgs = {
  userId: string;
  enabled?: boolean;
  onMessages: (messages: ChatMessage[]) => void;
};

export function usePersonalSync({
  userId,
  enabled = true,
  onMessages,
}: UsePersonalSyncArgs) {
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunAtRef = useRef<number | null>(null);
  const seenTriggerDuringCooldownRef = useRef(false);

  const scheduleSync = useCallback(
    (reason: SyncReason) => {
      if (!enabled || !userId) return;

      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }

      const now = Date.now();
      const lastRunAt = lastRunAtRef.current;
      if (lastRunAt && now - lastRunAt < SYNC_COOLDOWN_MS) {
        pendingRef.current = true;
        seenTriggerDuringCooldownRef.current = true;
        if (!cooldownTimerRef.current) {
          const waitMs = SYNC_COOLDOWN_MS - (now - lastRunAt);
          cooldownTimerRef.current = setTimeout(() => {
            cooldownTimerRef.current = null;
            if (
              pendingRef.current &&
              !inFlightRef.current &&
              seenTriggerDuringCooldownRef.current
            ) {
              pendingRef.current = false;
              seenTriggerDuringCooldownRef.current = false;
              scheduleSync('cooldown');
            }
          }, waitMs);
        }
        return;
      }

      inFlightRef.current = true;
      pendingRef.current = false;
      lastRunAtRef.current = now;
      seenTriggerDuringCooldownRef.current = false;

      void (async () => {
        try {
          const batch = await getChatSince({
            householdId: null,
            cursor: null,
            limit: SYNC_PAGE_LIMIT,
          });
          if (batch.length) {
            onMessages(batch);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'personal_chat_sync_failed';
          console.warn('[realtime] personal chat sync failed', {
            error: message,
            reason,
          });
        } finally {
          inFlightRef.current = false;
          if (pendingRef.current) {
            pendingRef.current = false;
            scheduleSync('pending');
          }
        }
      })();
    },
    [enabled, onMessages, userId],
  );

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, []);

  return { scheduleSync };
}
