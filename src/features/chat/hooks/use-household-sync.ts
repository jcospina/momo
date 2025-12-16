'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { ChatMessage } from '@lib-types/chat-messages';
import {
  SYNC_COOLDOWN_MS,
  SYNC_MAX_PAGES,
  SYNC_PAGE_LIMIT,
} from '../chat.constants';
import type { SyncCursor, SyncReason } from '../chat.types';
import { fetchChatSync } from '../utils/chat-sync';

type UseHouseholdSyncArgs = {
  householdId: string | null;
  enabled?: boolean;
  getCursor: () => SyncCursor | null;
  onMessages: (messages: ChatMessage[]) => void;
};

export function useHouseholdSync({
  householdId,
  enabled = true,
  getCursor,
  onMessages,
}: UseHouseholdSyncArgs) {
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunAtRef = useRef<number | null>(null);
  const seenTriggerDuringCooldownRef = useRef(false);

  const scheduleSync = useCallback(
    (reason: SyncReason) => {
      if (!enabled || !householdId) return;

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
        let cursor = getCursor();
        let total = 0;
        let page = 0;
        try {
          for (; page < SYNC_MAX_PAGES; page += 1) {
            const batch = await fetchChatSync({
              householdId,
              cursor,
              limit: SYNC_PAGE_LIMIT,
            });
            if (!batch.length) break;
            total += batch.length;
            onMessages(batch);
            const last = batch[batch.length - 1];
            cursor = { created_at: last.created_at, id: last.id };
            if (batch.length < SYNC_PAGE_LIMIT) break;
          }
          if (page >= SYNC_MAX_PAGES) {
            console.warn('[realtime] chat sync capped', {
              household_id: householdId,
              limit: SYNC_PAGE_LIMIT,
              pages: SYNC_MAX_PAGES,
              total,
              reason,
            });
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'chat_sync_failed';
          console.warn('[realtime] chat sync failed', {
            household_id: householdId,
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
    [enabled, getCursor, householdId, onMessages],
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
