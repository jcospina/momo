import { useSyncExternalStore } from 'react';

type Px = `${number}px`;
type Ratio = `${number}/${number}`;
type Dppx = `${number}dppx`;
type Dpi = `${number}dpi`;
type Resolution = Dppx | Dpi;

type Orientation = 'portrait' | 'landscape';
type ColorScheme = 'light' | 'dark' | 'no-preference';
type MotionPref = 'reduce' | 'no-preference';
type Hover = 'hover' | 'none';
type Pointer = 'none' | 'coarse' | 'fine';

export type MediaQuery =
  | `(max-width: ${Px})`
  | `(min-width: ${Px})`
  | `(width: ${Px})`
  | `(max-height: ${Px})`
  | `(min-height: ${Px})`
  | `(height: ${Px})`
  | `(orientation: ${Orientation})`
  | `(aspect-ratio: ${Ratio})`
  | `(min-aspect-ratio: ${Ratio})`
  | `(max-aspect-ratio: ${Ratio})`
  | `(prefers-color-scheme: ${ColorScheme})`
  | `(prefers-reduced-motion: ${MotionPref})`
  | `(hover: ${Hover})`
  | `(pointer: ${Pointer})`
  | `(resolution: ${Resolution})`
  | `(min-resolution: ${Resolution})`
  | `(max-resolution: ${Resolution})`;

export function useMediaQuery<T extends MediaQuery>(query: T): boolean {
  const getSnapshot = () => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const subscribe = (cb: () => void) => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return () => {
        // noop: media query listeners unavailable
      };
    }
    const mql = window.matchMedia(query);
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function mq<T extends MediaQuery>(x: T) {
  return x;
}
