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

export type CategoryUserWindowData = {
  categoryItems: CategoryTotal[];
  categoryTooltip: Record<string, CategoryTooltipEntry[]>;
  userTotalsItems: Array<{ user_label: string; totalCents: number }>;
  userTooltip: Record<string, UserTooltipEntry[]>;
};

export function formatCategoryLabel(category: string) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  const userTotals = new Map<string, number>();
  const categoryTooltipMap = new Map<string, Map<string, number>>();
  const userTooltipMap = new Map<string, Map<string, number>>();

  filteredRows.forEach(row => {
    const category = row.category ?? 'uncategorized';
    const categoryLabel = formatCategoryLabel(category);
    const userLabel = toFirstName(row.user_label ?? 'Unknown');

    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + row.total_cents,
    );
    userTotals.set(
      userLabel,
      (userTotals.get(userLabel) ?? 0) + row.total_cents,
    );

    const categoryMap =
      categoryTooltipMap.get(categoryLabel) ?? new Map<string, number>();
    categoryMap.set(
      userLabel,
      (categoryMap.get(userLabel) ?? 0) + row.total_cents,
    );
    categoryTooltipMap.set(categoryLabel, categoryMap);

    const userMap = userTooltipMap.get(userLabel) ?? new Map<string, number>();
    userMap.set(
      categoryLabel,
      (userMap.get(categoryLabel) ?? 0) + row.total_cents,
    );
    userTooltipMap.set(userLabel, userMap);
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

  const userTotalsItems = Array.from(userTotals.entries())
    .map(([user_label, totalCents]) => ({ user_label, totalCents }))
    .filter(item => item.totalCents > 0);

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
