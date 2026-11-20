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
      categoryFamilies: {
        food: 'oklch(0.719 0.1751 22.5)',
        home: 'oklch(0.7934 0.1661 69.16)',
        transport: 'oklch(0.8259 0.1358 216.9)',
        wellbeing: 'oklch(0.8736 0.2433 149.53)',
        fun: 'oklch(0.7049 0.1837 317.15)',
        people: 'oklch(0.86 0.17 103)',
        money: 'oklch(0.7 0.045 255)',
      },
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
      // Muted, inky versions of the same families so Paper keeps its calm.
      categoryFamilies: {
        food: 'oklch(0.66 0.14 38)',
        home: 'oklch(0.8 0.11 72)',
        transport: 'oklch(0.73 0.08 205)',
        wellbeing: 'oklch(0.76 0.09 145)',
        fun: 'oklch(0.66 0.1 330)',
        people: 'oklch(0.86 0.11 98)',
        money: 'oklch(0.6 0.04 250)',
      },
      members: [
        'oklch(75% 0.1 195)',
        'oklch(63% 0.16 38)',
        'oklch(0.74 0.09 145)',
        'oklch(0.66 0.1 330)',
        'oklch(82% 0.12 75)',
      ],
    },
  },
];

export const DEFAULT_THEME_NAME = THEMES_CONFIG[0].name;
