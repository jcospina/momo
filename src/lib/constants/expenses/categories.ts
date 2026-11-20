import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@lib-types/expenses';

/**
 * Categories are grouped into families so related spending looks related:
 * every family sits on one brand hue and each category is a distinct shade
 * of it. The order here is the canonical order everywhere (CSS emission,
 * pickers, legends).
 */
export const CATEGORY_FAMILY_IDS = [
  'food',
  'home',
  'transport',
  'wellbeing',
  'fun',
  'people',
  'money',
] as const;

export type CategoryFamilyId = (typeof CATEGORY_FAMILY_IDS)[number];

export type CategoryFamily = {
  id: CategoryFamilyId;
  categories: readonly ExpenseCategory[];
};

export const CATEGORY_FAMILIES: readonly CategoryFamily[] = [
  { id: 'food', categories: ['dining', 'groceries', 'treats'] },
  { id: 'home', categories: ['housing', 'utilities'] },
  { id: 'transport', categories: ['transportation', 'vehicle', 'travel'] },
  { id: 'wellbeing', categories: ['health', 'self_care'] },
  {
    id: 'fun',
    categories: ['entertainment', 'fun', 'subscriptions', 'shopping'],
  },
  { id: 'people', categories: ['kids', 'pets', 'gifts', 'education'] },
  { id: 'money', categories: ['income', 'transfer', 'debt', 'fees'] },
];

/** `EXPENSE_CATEGORIES` without its duplicate entries, in source order. */
export const UNIQUE_EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  ...new Set(EXPENSE_CATEGORIES),
];

/**
 * Stored when the parser finds no category (DB column default). Dialog saves
 * write `null` instead; both mean "needs a category".
 */
export const UNCATEGORIZED = 'uncategorized';

/** A category as the UI sees it: a known category or "uncategorized". */
export type CategoryKey = ExpenseCategory | typeof UNCATEGORIZED;

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(
  UNIQUE_EXPENSE_CATEGORIES,
);

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && KNOWN_CATEGORIES.has(value);
}

/**
 * Collapses null, the `'uncategorized'` default and any slug outside the
 * known list (the DB only checks the slug format) into `'uncategorized'`.
 */
export function normalizeCategory(
  value: string | null | undefined,
): CategoryKey {
  return isExpenseCategory(value) ? value : UNCATEGORIZED;
}

/** Most common picks first — shown as one-tap chips when a category is missing. */
export const QUICK_PICK_CATEGORIES: readonly ExpenseCategory[] = [
  'dining',
  'groceries',
  'shopping',
  'transportation',
  'fun',
  'gifts',
];

/** Key used by charts for the bucket that groups the long tail of categories. */
export const OTHERS_CATEGORY_KEY = 'others';

/** `food_delivery` → `Food Delivery`, for slugs outside the known list. */
export function humanizeCategorySlug(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
