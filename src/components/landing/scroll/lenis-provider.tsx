'use client';

import { useMediaQuery } from '@hooks/use-media-query';
import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

const LENIS_OPTIONS = {
  lerp: 0.1,
  smoothWheel: true,
  syncTouch: false,
  anchors: { offset: 0 },
} as const;

export function LenisProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
