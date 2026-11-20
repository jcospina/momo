import { humanizeCategorySlug } from '@constants/expenses/categories';
import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';

export type CategoryTotal = {
  category: string;
  totalCents: number;
};

export type MonthlyCategoryTotals = {
  month: string;
  categories: CategoryTotal[];
};

export type CategoryTooltipEntry = {
  label: string;
  totalCents: number;
};

export type UserTooltipEntry = {
  category: string;
  totalCents: number;
};

export type UserTotalItem = {
  /** Stable member key: the author's id, or their name for legacy rows. */
  key: string;
  user_label: string;
  totalCents: number;
  /** The member's fixed colour slot, when known. */
  color_slot: number | null;
};

export type CategoryUserWindowData = {
  categoryItems: CategoryTotal[];
  /** Keyed by category slug. */
  categoryTooltip: Record<string, CategoryTooltipEntry[]>;
  userTotalsItems: UserTotalItem[];
  /** Keyed by `UserTotalItem.key`; entries carry category slugs. */
  userTooltip: Record<string, UserTooltipEntry[]>;
};

/** English title case for a slug. UI code should use `useCategoryLabel`. */
export function formatCategoryLabel(category: string) {
  return humanizeCategorySlug(category);
}

export function toFirstName(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return 'Unknown';
  const [firstToken] = trimmed.split(/\s+/);
  const [emailBase] = firstToken.split('@');
  const [simple] = emailBase.split(/[._-]/);
  return simple || emailBase || firstToken;
}

export function buildMonthlyCategoryTotals(
  rows: MonthlyByCategoryUserRow[],
  months: string[],
): MonthlyCategoryTotals[] {
  const monthSet = new Set(months);
  const monthMap = new Map<string, Map<string, number>>();

  rows.forEach(row => {
    if (!monthSet.has(row.month)) return;
    const category = row.category ?? 'uncategorized';
    const categoryMap = monthMap.get(row.month) ?? new Map<string, number>();
    categoryMap.set(
      category,
      (categoryMap.get(category) ?? 0) + row.total_cents,
    );
    monthMap.set(row.month, categoryMap);
  });

  return months.map(month => ({
    month,
    categories: Array.from(monthMap.get(month)?.entries() ?? []).map(
      ([category, totalCents]) => ({
        category,
        totalCents,
      }),
    ),
  }));
}

export function buildCategoryUserWindowData(
  rows: MonthlyByCategoryUserRow[],
  windowMonths: string[],
): CategoryUserWindowData {
  const monthSet = new Set(windowMonths);
  const filteredRows = rows.filter(row => monthSet.has(row.month));

  const categoryTotals = new Map<string, number>();
  const userTotals = new Map<string, UserTotalItem>();
  const categoryTooltipMap = new Map<string, Map<string, number>>();
  const userTooltipMap = new Map<string, Map<string, number>>();

  filteredRows.forEach(row => {
    const category = row.category ?? 'uncategorized';
    const userLabel = toFirstName(row.user_label ?? 'Unknown');
    // Members are told apart by id so two people sharing a first name never
    // merge; rows from before ids were exposed fall back to the name.
    const userKey = row.user_id ?? userLabel;

    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + row.total_cents,
    );
    const userTotal = userTotals.get(userKey) ?? {
      key: userKey,
      user_label: userLabel,
      totalCents: 0,
      color_slot: row.color_slot ?? null,
    };
    userTotal.totalCents += row.total_cents;
    userTotal.color_slot ??= row.color_slot ?? null;
    userTotals.set(userKey, userTotal);

    const categoryMap =
      categoryTooltipMap.get(category) ?? new Map<string, number>();
    categoryMap.set(
      userLabel,
      (categoryMap.get(userLabel) ?? 0) + row.total_cents,
    );
    categoryTooltipMap.set(category, categoryMap);

    const userMap = userTooltipMap.get(userKey) ?? new Map<string, number>();
    userMap.set(category, (userMap.get(category) ?? 0) + row.total_cents);
    userTooltipMap.set(userKey, userMap);
  });

  const categoryItems = Array.from(categoryTotals.entries()).map(
    ([category, totalCents]) => ({
      category,
      totalCents,
    }),
  );

  const categoryTooltip = Object.fromEntries(
    Array.from(categoryTooltipMap.entries()).map(([category, userMap]) => [
      category,
      Array.from(userMap.entries())
        .map(([label, totalCents]) => ({ label, totalCents }))
        .filter(entry => entry.totalCents > 0)
        .sort((a, b) => b.totalCents - a.totalCents),
    ]),
  );

  const userTotalsItems = Array.from(userTotals.values()).filter(
    item => item.totalCents > 0,
  );

  const userTooltip = Object.fromEntries(
    Array.from(userTooltipMap.entries()).map(([label, categoryMap]) => [
      label,
      Array.from(categoryMap.entries())
        .map(([category, totalCents]) => ({ category, totalCents }))
        .filter(entry => entry.totalCents > 0)
        .sort((a, b) => b.totalCents - a.totalCents),
    ]),
  );

  return {
    categoryItems,
    categoryTooltip,
    userTotalsItems,
    userTooltip,
  };
}
