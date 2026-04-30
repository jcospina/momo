import type { ThemeConfig } from './types';

/**
 * Theme registry. To add a new theme, paste a new object below — the dropdown,
 * swatches, and CSS variable overrides are all derived automatically. Required
 * palette keys are: text, surface, background, primary, secondary, info,
 * feature, warm. See `types.ts` for the optional fields and their fallbacks.
 */
export const THEMES_CONFIG: ThemeConfig[] = [
  {
    name: 'sunbeam',
    label: 'Sunbeam',
    palette: {
      text: 'oklch(11.449% 0.0736 272.286)',
      surface: 'oklch(96.868% 0.01862 96.902)',
      background: 'oklch(0.9224 0.1669 99.9)',
      primary: 'oklch(0.8736 0.2433 149.53)',
      secondary: 'oklch(0.719 0.1751 22.5)',
      info: 'oklch(0.8259 0.1358 216.9)',
      feature: 'oklch(0.7049 0.1837 317.15)',
      warm: 'oklch(0.7934 0.1661 69.16)',
      disabled: 'oklch(0.7522 0.0193 261.19)',
    },
  },
  {
    name: 'paper',
    label: 'Paper & Ink',
    palette: {
      text: 'oklch(18% 0.02 60)',
      surface: 'oklch(98% 0.012 85)',
      background: 'oklch(95% 0.025 85)',
      primary: 'oklch(63% 0.16 38)',
      secondary: 'oklch(40% 0.06 250)',
      info: 'oklch(75% 0.1 195)',
      feature: 'oklch(82% 0.13 90)',
      warm: 'oklch(82% 0.12 75)',
      toggle: 'oklch(88% 0.04 75)',
      // Secondary becomes a deep blue here — default ink text would be unreadable.
      textOnSecondary: 'oklch(98% 0.012 85)',
    },
  },
];

export const DEFAULT_THEME_NAME = THEMES_CONFIG[0].name;
