'use client';

import { useEffect, useRef } from 'react';

import { subscribeToHouseholdChat } from '@helpers/chat-realtime';
import { useRealtimeClient } from '@hooks/use-realtime-client';
import type { ChatMessage } from '@lib-types/chat-messages';
import {
  RESUBSCRIBE_BACKOFF_FACTOR,
  RESUBSCRIBE_BASE_DELAY_MS,
  RESUBSCRIBE_MAX_ATTEMPTS,
  RESUBSCRIBE_MAX_DELAY_MS,
  STALL_CHECK_INTERVAL_MS,
  STALL_HIDDEN_THRESHOLD_MS,
  STALL_VISIBLE_THRESHOLD_MS,
} from '../chat.constants';
import type { RealtimeState } from '../chat.types';

type UseHouseholdRealtimeArgs = {
  householdId: string | null;
  isHousehold: boolean;
  onMessage: (msg: ChatMessage) => void;
  onStatus?: (status: string) => void;
};

export function useHouseholdRealtime({
  householdId,
  isHousehold,
  onMessage,
  onStatus,
}: UseHouseholdRealtimeArgs) {
  const realtime = useRealtimeClient();
  const { client, error, loading, version, reset } = realtime;

  const lastStatusRef = useRef<string | null>(null);
  const lastMessageAtRef = useRef<number | null>(null);
  const stallLoggedRef = useRef(false);
  const resubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef<RealtimeState>('idle');

  useChannelLifecycle({
    householdId,
    isHousehold,
    client,
    error,
    loading,
    version,
    reset,
    onMessage,
    onStatus,
    lastStatusRef,
    lastMessageAtRef,
    stallLoggedRef,
    resubscribeRef,
    stateRef,
  });

  useStallMonitor({
    householdId,
    isHousehold,
    lastStatusRef,
    lastMessageAtRef,
    stallLoggedRef,
    resubscribeRef,
  });

  return realtime;
}

type ChannelLifecycleArgs = {
  householdId: string | null;
  isHousehold: boolean;
  client: ReturnType<typeof useRealtimeClient>['client'];
  error: ReturnType<typeof useRealtimeClient>['error'];
  loading: ReturnType<typeof useRealtimeClient>['loading'];
  version: number;
  reset: () => void;
  onMessage: (msg: ChatMessage) => void;
  onStatus?: (status: string) => void;
  lastStatusRef: React.MutableRefObject<string | null>;
  lastMessageAtRef: React.MutableRefObject<number | null>;
  stallLoggedRef: React.MutableRefObject<boolean>;
  resubscribeRef: React.MutableRefObject<(() => void) | null>;
  stateRef: React.MutableRefObject<RealtimeState>;
};

function useChannelLifecycle({
  householdId,
  isHousehold,
  client,
  error,
  loading,
  version,
  reset,
  onMessage,
  onStatus,
  lastStatusRef,
  lastMessageAtRef,
  stallLoggedRef,
  resubscribeRef,
  stateRef,
}: ChannelLifecycleArgs) {
  const channelRef = useRef<ReturnType<typeof subscribeToHouseholdChat> | null>(
    null,
  );
  const resettingRef = useRef(false);
  const subscribeRef = useRef<(() => void) | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isHousehold || !householdId) return;
    if (!client || loading || error) return;
    let cancelled = false;
    let resubscribeTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const cleanupChannel = () => {
      const channel = channelRef.current;
      if (channel) {
        channel.unsubscribe();
        client?.removeChannel(channel);
      }
      channelRef.current = null;
      stateRef.current = 'idle';
    };
    cleanupRef.current = cleanupChannel;

    const scheduleResubscribe = () => {
      if (cancelled || resubscribeTimer) return;
      if (resettingRef.current) return;
      stateRef.current = 'resubscribing';
      const delay = Math.min(
        RESUBSCRIBE_BASE_DELAY_MS * RESUBSCRIBE_BACKOFF_FACTOR ** attempt,
        RESUBSCRIBE_MAX_DELAY_MS,
      );
      attempt = Math.min(attempt + 1, RESUBSCRIBE_MAX_ATTEMPTS);
      resubscribeTimer = setTimeout(() => {
        resubscribeTimer = null;
        if (cancelled) return;
        resettingRef.current = true;
        cleanupChannel();
        if (reset) {
          reset();
        } else {
          subscribeRef.current?.();
        }
      }, delay);
    };
    resubscribeRef.current = scheduleResubscribe;

    const subscribe = () => {
      if (cancelled || !client) return;
      stateRef.current = 'subscribing';
      cleanupChannel();
      channelRef.current = subscribeToHouseholdChat(
        householdId as string,
        client,
        payload => {
          if (!payload?.message) return;
          lastMessageAtRef.current = Date.now();
          stallLoggedRef.current = false;
          onMessage(payload.message as ChatMessage);
        },
        status => {
          lastStatusRef.current = status;
          onStatus?.(status);
          if (status === 'SUBSCRIBED') {
            attempt = 0;
            if (resubscribeTimer) {
              clearTimeout(resubscribeTimer);
              resubscribeTimer = null;
            }
            resettingRef.current = false;
            stallLoggedRef.current = false;
            stateRef.current = 'subscribed';
            return;
          }
          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            stateRef.current = 'error';
            scheduleResubscribe();
          }
        },
      );
    };
    subscribeRef.current = subscribe;

    subscribe();
    return () => {
      cancelled = true;
      if (resubscribeTimer) {
        clearTimeout(resubscribeTimer);
        resubscribeTimer = null;
      }
      resubscribeRef.current = null;
      subscribeRef.current = null;
      cleanupRef.current = null;
      cleanupChannel();
    };
  }, [
    client,
    error,
    householdId,
    isHousehold,
    loading,
    onMessage,
    onStatus,
    reset,
    version,
    resubscribeRef,
    lastMessageAtRef,
    lastStatusRef,
    stallLoggedRef,
    stateRef,
  ]);
}

type StallMonitorArgs = {
  householdId: string | null;
  isHousehold: boolean;
  lastStatusRef: React.MutableRefObject<string | null>;
  lastMessageAtRef: React.MutableRefObject<number | null>;
  stallLoggedRef: React.MutableRefObject<boolean>;
  resubscribeRef: React.MutableRefObject<(() => void) | null>;
};

function useStallMonitor({
  householdId,
  isHousehold,
  lastStatusRef,
  lastMessageAtRef,
  stallLoggedRef,
  resubscribeRef,
}: StallMonitorArgs) {
  useEffect(() => {
    if (!isHousehold || !householdId) return;
    const interval = setInterval(() => {
      if (lastStatusRef.current !== 'SUBSCRIBED') return;
      if (!lastMessageAtRef.current) return;
      const elapsed = Date.now() - lastMessageAtRef.current;
      const visible =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';
      const threshold = visible
        ? STALL_VISIBLE_THRESHOLD_MS
        : STALL_HIDDEN_THRESHOLD_MS;
      if (elapsed < threshold || stallLoggedRef.current) return;
      stallLoggedRef.current = true;
      lastMessageAtRef.current = Date.now();
      resubscribeRef.current?.();
    }, STALL_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [
    householdId,
    isHousehold,
    lastMessageAtRef,
    lastStatusRef,
    resubscribeRef,
    stallLoggedRef,
  ]);
}
