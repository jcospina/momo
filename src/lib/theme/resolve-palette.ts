import type { ResolvedPalette, ThemePalette } from './types';

export function resolvePalette(palette: ThemePalette): ResolvedPalette {
  return {
    ...palette,
    disabled:
      palette.disabled ?? `color-mix(in oklch, ${palette.text}, white 60%)`,
    toggle: palette.toggle ?? palette.warm,
    textOnSecondary: palette.textOnSecondary ?? palette.text,
    error: palette.error ?? palette.secondary,
    warning:
      palette.warning ?? `color-mix(in oklch, ${palette.warm}, black 10%)`,
    success: palette.success ?? palette.primary,
    chart:
      palette.chart ??
      ([
        palette.info,
        palette.secondary,
        palette.feature,
        palette.warm,
        palette.primary,
        `color-mix(in oklch, ${palette.warm}, ${palette.feature} 50%)`,
      ] as [string, string, string, string, string, string]),
    chartStroke: palette.chartStroke ?? palette.text,
    chartTooltipBg: palette.chartTooltipBg ?? palette.surface,
  };
}
