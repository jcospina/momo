import { type RefObject, useCallback, useEffect, useRef } from 'react';

type ScrollAnchor =
  | 'top-bottom'
  | 'top-center'
  | 'top-top'
  | 'bottom-top'
  | 'bottom-center'
  | 'bottom-bottom'
  | 'center-bottom'
  | 'center-center'
  | 'center-top';

export type ScrollProgressOptions = {
  start?: ScrollAnchor;
  end?: ScrollAnchor;
};

function anchorToRectTop(
  anchor: ScrollAnchor,
  viewportHeight: number,
  elementHeight: number,
): number {
  const [el, vp] = anchor.split('-') as [
    'top' | 'center' | 'bottom',
    'top' | 'center' | 'bottom',
  ];
  const elOffset =
    el === 'top' ? 0 : el === 'center' ? elementHeight / 2 : elementHeight;
  const vpOffset =
    vp === 'top' ? 0 : vp === 'center' ? viewportHeight / 2 : viewportHeight;
  return vpOffset - elOffset;
}

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  options: ScrollProgressOptions = {},
): () => number {
  const { start = 'top-bottom', end = 'bottom-top' } = options;
  return useCallback(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const startTop = anchorToRectTop(start, vh, rect.height);
    const endTop = anchorToRectTop(end, vh, rect.height);
    const span = startTop - endTop;
    if (span === 0) return rect.top <= startTop ? 1 : 0;
    const p = (startTop - rect.top) / span;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }, [ref, start, end]);
}

export function useScrollTick(callback: () => void): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let rafId: number | null = null;
    let scheduled = false;

    const flush = () => {
      scheduled = false;
      rafId = null;
      cbRef.current();
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      rafId = requestAnimationFrame(flush);
    };

    cbRef.current();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);
}
