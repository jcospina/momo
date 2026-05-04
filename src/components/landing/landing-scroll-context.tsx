'use client';

import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useMemo,
  useRef,
} from 'react';

type LandingScrollContextValue = {
  spacerRef: RefObject<HTMLDivElement | null>;
};

const LandingScrollContext = createContext<LandingScrollContextValue | null>(
  null,
);

export function LandingScrollProvider({ children }: { children: ReactNode }) {
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ spacerRef }), []);
  return (
    <LandingScrollContext.Provider value={value}>
      {children}
    </LandingScrollContext.Provider>
  );
}

export function useHeroSpacerRef(): RefObject<HTMLDivElement | null> {
  const ctx = useContext(LandingScrollContext);
  if (!ctx) {
    throw new Error(
      'useHeroSpacerRef must be used inside <LandingScrollProvider>',
    );
  }
  return ctx.spacerRef;
}
