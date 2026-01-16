'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type NavigationProgressContextValue = {
  pending: boolean;
  navigate: (to: string) => void;
  start: () => void;
  stop: () => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

type NavigationProgressProviderProps = {
  children: React.ReactNode;
};

export function NavigationProgressProvider({
  children,
}: NavigationProgressProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastPathnameRef = useRef(pathname);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearStopTimer();
    startTimeRef.current = Date.now();
    setPending(true);
  }, [clearStopTimer]);

  const stop = useCallback(() => {
    clearStopTimer();
    const minVisibleMs = 450;
    const hideDelayMs = 180;
    const elapsed = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : 0;
    const remaining = Math.max(minVisibleMs - elapsed, 0);
    stopTimerRef.current = setTimeout(() => {
      setPending(false);
      startTimeRef.current = null;
    }, remaining + hideDelayMs);
  }, [clearStopTimer]);

  const navigate = useCallback(
    (to: string) => {
      if (!to) return;
      if (to === pathname) return;
      start();
      router.push(to);
    },
    [pathname, router, start],
  );

  useEffect(() => {
    if (pathname !== lastPathnameRef.current) {
      lastPathnameRef.current = pathname;
      if (pending) {
        stop();
      }
    }
  }, [pathname, pending, stop]);

  useEffect(() => {
    return () => {
      clearStopTimer();
    };
  }, [clearStopTimer]);

  const value = useMemo(
    () => ({
      pending,
      navigate,
      start,
      stop,
    }),
    [navigate, pending, start, stop],
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) {
    throw new Error(
      'useNavigationProgress must be used within NavigationProgressProvider',
    );
  }
  return ctx;
}
