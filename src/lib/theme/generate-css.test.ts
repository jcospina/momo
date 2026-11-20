import { UNIQUE_EXPENSE_CATEGORIES } from '@constants/expenses/categories';
import { generateThemeCSS } from './generate-css';
import { THEMES_CONFIG } from './themes.config';

describe('generateThemeCSS', () => {
  const css = generateThemeCSS(THEMES_CONFIG);

  it('emits one block per theme', () => {
    for (const theme of THEMES_CONFIG) {
      expect(css).toContain(`:root[data-schema="${theme.name}"]`);
    }
  });

  it('emits a fill and an ink per category in every theme', () => {
    const themeCount = THEMES_CONFIG.length;
    for (const category of [
      ...UNIQUE_EXPENSE_CATEGORIES,
      'uncategorized',
      'others',
    ]) {
      expect(css.split(`--category-${category}: oklch(`)).toHaveLength(
        themeCount + 1,
      );
      expect(css.split(`--category-${category}-ink: `)).toHaveLength(
        themeCount + 1,
      );
    }
  });

  it('emits five member slots plus a "none" fallback', () => {
    for (const slot of ['1', '2', '3', '4', '5', 'none']) {
      expect(css).toContain(`--member-${slot}: oklch(`);
      expect(css).toContain(`--member-${slot}-ink: `);
    }
  });
});
