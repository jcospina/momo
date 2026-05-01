'use client';

import { ParentSize } from '@visx/responsive';
import type { ReactNode } from 'react';

type ChartShellProps = {
  /** Render function — receives the measured pixel dimensions. */
  children: (size: { width: number; height: number }) => ReactNode;
  /**
   * Minimum dimensions to render at. Below this we render `null` to avoid
   * SVG paths with NaN coordinates during the initial measurement frame.
   */
  minWidth?: number;
  minHeight?: number;
  className?: string;
};

/**
 * Shared wrapper that fills its parent container, observes resize, and hands
 * `(width, height)` down to the chart implementation.
 */
export function ChartShell({
  children,
  minWidth = 0,
  minHeight = 0,
  className,
}: ChartShellProps) {
  return (
    <ParentSize className={className} debounceTime={0}>
      {({ width, height }) => {
        if (width < minWidth || height < minHeight) return null;
        return children({ width, height });
      }}
    </ParentSize>
  );
}
