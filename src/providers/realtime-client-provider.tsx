'use client';

import { useRealtimeClient } from '@hooks/use-realtime-client';
import { createContext, useContext } from 'react';

type RealtimeClientContextValue = ReturnType<typeof useRealtimeClient>;

const RealtimeClientContext = createContext<RealtimeClientContextValue | null>(
  null,
);

type RealtimeClientProviderProps = {
  children: React.ReactNode;
};

export function RealtimeClientProvider({
  children,
}: RealtimeClientProviderProps) {
  const realtime = useRealtimeClient();

  return (
    <RealtimeClientContext.Provider value={realtime}>
      {children}
    </RealtimeClientContext.Provider>
  );
}

export function useRealtimeClientContext() {
  const ctx = useContext(RealtimeClientContext);
  if (!ctx) {
    throw new Error(
      'useRealtimeClientContext must be used within RealtimeClientProvider',
    );
  }
  return ctx;
}
