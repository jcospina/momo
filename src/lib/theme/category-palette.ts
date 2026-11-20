import {
  CATEGORY_FAMILIES,
  type CategoryKey,
  UNCATEGORIZED,
} from '@constants/expenses/categories';
import { contrastRatio, formatOklch, type Oklch, parseOklch } from './oklch';
import type { ResolvedPalette } from './types';

/** A fill colour plus the text colour that reads best on top of it. */
export type ColorToken = { fill: string; ink: string };

/** Every category plus the charts' "Others" bucket. */
export type CategoryTokenKey = CategoryKey | 'others';

export const MEMBER_SLOT_COUNT = 5;

/**
 * How each position in a family departs from the family base. Position 0 is
 * the base itself, so a family's first category keeps the exact brand colour.
 * Steps alternate darker/lighter and nudge the hue so siblings stay apart.
 */
const SHADE_STEPS = [
  { lightness: 0, chromaScale: 1, hueShift: 0 },
  { lightness: -0.1, chromaScale: 0.92, hueShift: -10 },
  { lightness: 0.08, chromaScale: 0.85, hueShift: 10 },
  { lightness: -0.17, chromaScale: 0.9, hueShift: 18 },
] as const;

const MIN_LIGHTNESS = 0.35;
const MAX_LIGHTNESS = 0.93;
const MAX_CHROMA = 0.37;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function requireOklch(value: string, label: string): Oklch {
  const parsed = parseOklch(value);
  if (!parsed) {
    throw new Error(
      `Theme colour for "${label}" must be an oklch(...) string to derive category shades; got "${value}".`,
    );
  }
  return parsed;
}

function shadeOf(base: Oklch, position: number): Oklch {
  const step = SHADE_STEPS[position % SHADE_STEPS.length];
  return {
    l: clamp(base.l + step.lightness, MIN_LIGHTNESS, MAX_LIGHTNESS),
    c: clamp(base.c * step.chromaScale, 0, MAX_CHROMA),
    h: base.h + step.hueShift,
  };
}

type InkCandidate = { value: string; color: Oklch | null };

/** Picks whichever of the theme's ink/surface colours contrasts more. */
function makeToken(fill: Oklch, inks: InkCandidate[]): ColorToken {
  let best = inks[0];
  let bestRatio = -1;
  for (const candidate of inks) {
    if (!candidate.color) continue;
    const ratio = contrastRatio(fill, candidate.color);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return { fill: formatOklch(fill), ink: best.value };
}

function inkCandidates(palette: ResolvedPalette): InkCandidate[] {
  return [
    { value: palette.text, color: parseOklch(palette.text) },
    { value: palette.surface, color: parseOklch(palette.surface) },
  ];
}

/** Quiet neutral on the ink's hue, for things that have no colour of their own. */
function neutral(palette: ResolvedPalette, lightness: number): Oklch {
  const text = parseOklch(palette.text);
  return { l: lightness, c: 0.018, h: text?.h ?? 260 };
}

export function buildCategoryTokens(
  palette: ResolvedPalette,
): Record<CategoryTokenKey, ColorToken> {
  const inks = inkCandidates(palette);
  const tokens = {} as Record<CategoryTokenKey, ColorToken>;

  for (const family of CATEGORY_FAMILIES) {
    const base = requireOklch(
      palette.categoryFamilies[family.id],
      `categoryFamilies.${family.id}`,
    );
    family.categories.forEach((category, position) => {
      const override = palette.categoryOverrides[category];
      const fill = override
        ? requireOklch(override, `categoryOverrides.${category}`)
        : shadeOf(base, position);
      tokens[category] = makeToken(fill, inks);
    });
  }

  tokens[UNCATEGORIZED] = makeToken(neutral(palette, 0.86), inks);
  tokens.others = makeToken(neutral(palette, 0.74), inks);
  return tokens;
}

export type MemberTokens = {
  /** Slot 1 is index 0. */
  slots: ColorToken[];
  /** For rows whose author has no slot (left the household, personal data). */
  none: ColorToken;
};

export function buildMemberTokens(palette: ResolvedPalette): MemberTokens {
  const inks = inkCandidates(palette);
  return {
    slots: palette.members.map((value, index) =>
      makeToken(requireOklch(value, `members[${index}]`), inks),
    ),
    none: makeToken(neutral(palette, 0.8), inks),
  };
}
