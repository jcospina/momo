import { resolvePalette } from './resolve-palette';
import { DEFAULT_THEME_NAME, THEMES_CONFIG } from './themes.config';

export type ThemeName = string;

export type ThemeDefinition = {
  name: ThemeName;
  label: string;
  swatches: [string, string, string];
};

export const DEFAULT_THEME: ThemeName = DEFAULT_THEME_NAME;

export const THEMES: ThemeDefinition[] = THEMES_CONFIG.map(theme => {
  const palette = resolvePalette(theme.palette);
  return {
    name: theme.name,
    label: theme.label,
    swatches: [palette.primary, palette.info, palette.feature],
  };
});

const THEME_NAMES = new Set(THEMES.map(t => t.name));

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && THEME_NAMES.has(value);
}
