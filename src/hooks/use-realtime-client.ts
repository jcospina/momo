'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

type UseRealtimeClientResult =
  | {
      client: SupabaseClient;
      loading: false;
      error: null;
      version: number;
      reset: () => void;
    }
  | {
      client: null;
      loading: boolean;
      error: string | null;
      version: number;
      reset: () => void;
    };

async function fetchRealtimeToken(): Promise<TokenResponse> {
  const res = await fetch('/api/realtime-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`token_failed_${res.status}`);
  }
  return res.json();
}

export function useRealtimeClient(): UseRealtimeClientResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [version, setVersion] = useState(0);
  const [resetCounter, setResetCounter] = useState(0);
  const clientRef = useRef<SupabaseClient | null>(null);
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
      refreshTimeout.current = null;
    }
    if (clientRef.current) {
      clientRef.current.removeAllChannels();
      clientRef.current = null;
    }
    setLoading(true);
    setError(null);
    setClient(null);
    setResetCounter(counter => counter + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const token = await fetchRealtimeToken();
        if (cancelled) return;

        const instance = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          },
        );
        clientRef.current = instance;

        await instance.realtime.setAuth(token.access_token);
        setClient(instance);
        setVersion(v => v + 1);
        setLoading(false);
        setError(null);

        const bufferMs = 30 * 1000;
        const refreshMs = Math.max(
          (token.expires_in ?? 60) * 1000 - bufferMs,
          10_000,
        );
        refreshTimeout.current = setTimeout(() => {
          setLoading(true);
          setup();
        }, refreshMs);
      } catch (err) {
        if (cancelled) return;
        const message = (err as Error).message;
        console.error('[realtime] token fetch failed', { error: message });
        setError(message);
        setLoading(false);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
      if (clientRef.current) {
        clientRef.current.removeAllChannels();
        clientRef.current = null;
        setClient(null);
      }
    };
  }, [resetCounter]);

  if (loading || error) {
    return { client: null, loading, error, version, reset };
  }

  return {
    client: client as SupabaseClient,
    loading: false,
    error: null,
    version,
    reset,
  };
}
