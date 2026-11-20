import {
  CATEGORY_FAMILIES,
  UNIQUE_EXPENSE_CATEGORIES,
} from '@constants/expenses/categories';
import { buildCategoryTokens, buildMemberTokens } from './category-palette';
import { contrastRatio, type Oklch, parseOklch } from './oklch';
import { resolvePalette } from './resolve-palette';
import { THEMES_CONFIG } from './themes.config';

/** Small text on a coloured chip must stay readable (WCAG AA). */
const MIN_INK_CONTRAST = 4.5;
/** Siblings in one family must still be told apart at a glance. */
const MIN_SIBLING_DISTANCE = 0.05;

function toOklab({ l, c, h }: Oklch) {
  const radians = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

function distance(first: Oklch, second: Oklch): number {
  const x = toOklab(first);
  const y = toOklab(second);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

function parsed(value: string): Oklch {
  const color = parseOklch(value);
  if (!color) throw new Error(`not oklch: ${value}`);
  return color;
}

describe('CATEGORY_FAMILIES', () => {
  it('covers every category exactly once', () => {
    const inFamilies = CATEGORY_FAMILIES.flatMap(family => family.categories);
    expect(new Set(inFamilies).size).toBe(inFamilies.length);
    expect([...inFamilies].sort()).toEqual(
      [...UNIQUE_EXPENSE_CATEGORIES].sort(),
    );
  });
});

describe.each(
  THEMES_CONFIG.map(theme => [theme.name, theme] as const),
)('%s theme', (_name, theme) => {
  const palette = resolvePalette(theme.palette);
  const categoryTokens = buildCategoryTokens(palette);
  const memberTokens = buildMemberTokens(palette);

  it('gives every category, "uncategorized" and "others" a colour', () => {
    for (const category of UNIQUE_EXPENSE_CATEGORIES) {
      expect(parseOklch(categoryTokens[category].fill)).not.toBeNull();
    }
    expect(parseOklch(categoryTokens.uncategorized.fill)).not.toBeNull();
    expect(parseOklch(categoryTokens.others.fill)).not.toBeNull();
  });

  it('keeps text readable on every category and member colour', () => {
    const tokens = [
      ...Object.values(categoryTokens),
      ...memberTokens.slots,
      memberTokens.none,
    ];
    for (const token of tokens) {
      expect(
        contrastRatio(parsed(token.fill), parsed(token.ink)),
      ).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
    }
  });

  it('keeps categories in the same family visibly different', () => {
    for (const family of CATEGORY_FAMILIES) {
      const fills = family.categories.map(category =>
        parsed(categoryTokens[category].fill),
      );
      fills.forEach((fill, index) => {
        for (const other of fills.slice(index + 1)) {
          expect(distance(fill, other)).toBeGreaterThanOrEqual(
            MIN_SIBLING_DISTANCE,
          );
        }
      });
    }
  });

  it('has five member colours', () => {
    expect(memberTokens.slots).toHaveLength(5);
  });
});
