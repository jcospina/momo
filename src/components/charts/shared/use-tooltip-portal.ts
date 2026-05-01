'use client';

import { useTooltip, useTooltipInPortal } from '@visx/tooltip';

/**
 * Pass this as the `style` prop on `<TooltipInPortal>` together with
 * `applyPositionStyle`. Visx's `Tooltip` only applies the
 * positioning `transform` it computes when `unstyled` is false; passing an
 * empty object keeps the transform while suppressing visx's default visual
 * styles (white background, padding, etc.) so our CSS module owns the look.
 */
export const EMPTY_TOOLTIP_STYLE: Record<string, never> = {};

/**
 * Combined Visx tooltip primitive with viewport-clamping enabled.
 *
 * The returned `containerRef` MUST be attached to the chart's outer container
 * — that's how `<TooltipInPortal>` knows to interpret the `left`/`top` we pass
 * as coordinates relative to that container. Without it, visx falls back to
 * the document body and tooltips drift to random spots on the page.
 *
 * `detectBounds: true` then auto-flips/clamps the portaled tooltip so it
 * never overflows the viewport.
 *
 * `zIndex` is required: visx's Portal otherwise leaves the wrapper div with
 * `z-index: auto`, which lets app stacking contexts (dialog 1001, select 1002,
 * etc.) paint over the tooltip. 1100 keeps it above every existing layer.
 */
export function useTooltipPortal<TooltipData>() {
  const tooltip = useTooltip<TooltipData>();
  const portal = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
    zIndex: 9999,
  });
  return {
    ...tooltip,
    ...portal,
  };
}

export type ChartTooltip<TooltipData> = ReturnType<
  typeof useTooltipPortal<TooltipData>
>;
