'use client';

import type { TouchEvent as ReactTouchEvent } from 'react';
import { useEffect, useRef } from 'react';

type Options = {
  /** True while a tooltip is open — controls whether outside taps dismiss it. */
  active: boolean;
  /** Called when the user taps outside `containerRef`. */
  onDismiss: () => void;
};

const OPEN_GUARD_MS = 200;

/**
 * Adds a global `pointerdown` listener that fires `onDismiss` whenever the user
 * taps outside the chart container. Using `pointerdown` avoids the delayed
 * synthetic mobile `click` path that can fight with the chart's own touch
 * activation.
 *
 * A `OPEN_GUARD_MS` window after attachment also short-circuits dismiss —
 * defense-in-depth against React Compiler / concurrent-mode effect timing
 * where the listener could be attached synchronously enough to see the
 * opening tap.
 *
 * The `containerRef` is returned and must be attached to the chart's outer
 * container `<div>`.
 */
export function useTouchTooltipDismiss({ active, onDismiss }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const openedAt = performance.now();
    const handlePointerDown = (event: PointerEvent) => {
      if (performance.now() - openedAt < OPEN_GUARD_MS) return;
      const container = containerRef.current;
      if (!container) return;
      if (event.target instanceof Node && container.contains(event.target)) {
        return;
      }
      onDismiss();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [active, onDismiss]);

  return containerRef;
}

export function getTouchClientPoint(event: ReactTouchEvent<Element>) {
  const touch = event.changedTouches[0] ?? event.touches[0];
  if (!touch) return null;
  return { clientX: touch.clientX, clientY: touch.clientY };
}
