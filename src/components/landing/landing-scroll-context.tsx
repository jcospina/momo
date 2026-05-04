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
  curtainContentRef: RefObject<HTMLDivElement | null>;
  curtainStageRef: RefObject<HTMLElement | null>;
  heroRef: RefObject<HTMLDivElement | null>;
};

const LandingScrollContext = createContext<LandingScrollContextValue | null>(
  null,
);

export function LandingScrollProvider({ children }: { children: ReactNode }) {
  const curtainContentRef = useRef<HTMLDivElement | null>(null);
  const curtainStageRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const value = useMemo(
    () => ({ curtainContentRef, curtainStageRef, heroRef }),
    [],
  );
  return (
    <LandingScrollContext.Provider value={value}>
      {children}
    </LandingScrollContext.Provider>
  );
}

export function useLandingCurtainRefs(): Pick<
  LandingScrollContextValue,
  'curtainContentRef' | 'curtainStageRef'
> {
  const ctx = useContext(LandingScrollContext);
  if (!ctx) {
    throw new Error(
      'useLandingCurtainRefs must be used inside <LandingScrollProvider>',
    );
  }
  return {
    curtainContentRef: ctx.curtainContentRef,
    curtainStageRef: ctx.curtainStageRef,
  };
}

export function useHeroRef(): RefObject<HTMLDivElement | null> {
  const ctx = useContext(LandingScrollContext);
  if (!ctx) {
    throw new Error('useHeroRef must be used inside <LandingScrollProvider>');
  }
  return ctx.heroRef;
}
