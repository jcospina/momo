import type { CategoryFamilyId } from '@constants/expenses/categories';
import { formatOklch, parseOklch } from './oklch';
import type { ResolvedPalette, ThemePalette } from './types';

/** "People" has no brand role of its own: lean the warm accent towards yellow. */
function derivePeopleBase(palette: ThemePalette): string {
  const warm = parseOklch(palette.warm);
  if (!warm) return palette.warm;
  return formatOklch({ ...warm, h: warm.h + 35 });
}

/** "Money" moves (income, transfers, debt, fees) sit on a quiet neutral. */
function deriveMoneyBase(palette: ThemePalette): string {
  const text = parseOklch(palette.text);
  return formatOklch({ l: 0.68, c: 0.035, h: text?.h ?? 260 });
}

function resolveCategoryFamilies(
  palette: ThemePalette,
): Record<CategoryFamilyId, string> {
  return {
    food: palette.secondary,
    home: palette.warm,
    transport: palette.info,
    wellbeing: palette.primary,
    fun: palette.feature,
    people: derivePeopleBase(palette),
    money: deriveMoneyBase(palette),
    ...palette.categoryFamilies,
  };
}

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
    categoryFamilies: resolveCategoryFamilies(palette),
    categoryOverrides: palette.categoryOverrides ?? {},
    members: palette.members ?? [
      palette.info,
      palette.secondary,
      palette.primary,
      palette.feature,
      palette.warm,
    ],
  };
}
