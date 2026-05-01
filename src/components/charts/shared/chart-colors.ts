/**
 * Symbolic chart colors. Each value is a `var(--…)` reference resolved at paint
 * time, so theme switches via the `data-schema` attribute repaint charts in the
 * same frame as the rest of the UI — no JS theme registration, no flicker.
 *
 * The CSS variables themselves are emitted per theme by
 * `src/lib/theme/generate-css.ts`.
 */
export const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const;

export const CHART_STROKE = 'var(--chart-stroke)';
export const CHART_TOOLTIP_BG = 'var(--chart-tooltip-bg)';
export const CHART_TOOLTIP_BORDER = 'var(--chart-tooltip-border)';
export const CHART_AXIS = 'var(--chart-axis)';
export const CHART_GRID = 'var(--chart-grid)';

export function paletteColor(index: number) {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
