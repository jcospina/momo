import { normalizeCategory } from '@constants/expenses/categories';
import { MEMBER_SLOT_COUNT } from './category-palette';

/**
 * CSS variable references for the fixed category and member colours emitted
 * per theme by `generate-css.ts`. Using `var(...)` (not resolved values) means
 * a theme switch repaints chat and charts in the same frame.
 */

/** `var(--category-dining)`; null, unknown and "uncategorized" share one neutral. */
export function categoryColorVar(category: string | null | undefined): string {
  return `var(--category-${normalizeCategory(category)})`;
}

/** Text colour that reads on top of `categoryColorVar(category)`. */
export function categoryInkVar(category: string | null | undefined): string {
  return `var(--category-${normalizeCategory(category)}-ink)`;
}

/** The charts' "Others" bucket. */
export const OTHERS_COLOR_VAR = 'var(--category-others)';
export const OTHERS_INK_VAR = 'var(--category-others-ink)';

function memberKey(slot: number | null | undefined): string {
  return slot &&
    Number.isInteger(slot) &&
    slot >= 1 &&
    slot <= MEMBER_SLOT_COUNT
    ? String(slot)
    : 'none';
}

/** `var(--member-2)` for slot 2; `var(--member-none)` when there is no slot. */
export function memberColorVar(slot: number | null | undefined): string {
  return `var(--member-${memberKey(slot)})`;
}

export function memberInkVar(slot: number | null | undefined): string {
  return `var(--member-${memberKey(slot)}-ink)`;
}
