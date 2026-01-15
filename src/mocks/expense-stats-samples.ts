export type MonthlySample = {
  month: string;
  category: string;
  user_label: string;
  total_cents: number;
  household_id: string | null;
};

function formatMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function buildMonthList(startMonth: string, count: number) {
  const [year, month] = startMonth.split('-').map(Number);
  if (!year || !month) return [] as string[];
  const result: string[] = [];
  const cursor = new Date(year, month - 1, 1);
  for (let i = 0; i < count; i += 1) {
    result.push(formatMonth(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export function buildMonthlyByCategoryUserRows({
  startMonth,
  count,
  householdId,
  userLabel,
  categories,
}: {
  startMonth: string;
  count: number;
  householdId: string | null;
  userLabel: string;
  categories?: string[];
}): MonthlySample[] {
  const months = buildMonthList(startMonth, count);
  const items = categories ?? ['rent', 'groceries'];
  return months.flatMap((month, index) =>
    items.map((category, categoryIndex) => ({
      month,
      category,
      user_label: userLabel,
      total_cents: (index + 1) * 1000 + categoryIndex * 100,
      household_id: householdId,
    })),
  );
}
