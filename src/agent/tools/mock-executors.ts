import datasetJson from '@evals/mocks/dataset/expenses.golden.json';
import type { ExpenseRecord } from '@lib-types/expenses';
import type { AgentToolExecutors } from '@/agent/tools/tools';
import type {
  AgentExpenseFilters,
  GetSpendingStatsInput,
  GetSpendingStatsResult,
  QueryExpensesInput,
  QueryExpensesResult,
  ResolveDateRangeInput,
  ResolveDateRangeResult,
  SpendingStatsGroupBy,
} from '@/agent/types';

const DEFAULT_TIMEZONE = 'America/Bogota';
const DEFAULT_QUERY_LIMIT = 50;

const DAY_OF_WEEK_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type GoldenDataset = {
  metadata: {
    currency: string;
    endDate: string;
    householdId: string;
    memberId: string;
    ownerId: string;
    rowCount: number;
    seed: number;
    startDate: string;
  };
  rows: GoldenExpenseRow[];
};

type GoldenExpenseRow = {
  user_id: string;
  household_id: string | null;
  amount_cents: number;
  currency: string;
  expense_date: string;
  merchant: string | null;
  category: string | null;
  note: string | null;
  tags: string[];
};

type GroupTotals = {
  amountCents: number;
  transactionCount: number;
};

const dataset = datasetJson as GoldenDataset;

export const mockDatasetMetadata = dataset.metadata;

const expenses = dataset.rows.map(toExpenseRecord).sort(compareExpenses);

export async function resolveDateRange(
  input: ResolveDateRangeInput,
): Promise<ResolveDateRangeResult> {
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const currentDate =
    normalizeDate(input.referenceDate) ?? dataset.metadata.endDate;
  const preset = input.preset ?? 'custom';
  const customStartDate = normalizeDate(input.startDate);
  const customEndDate = normalizeDate(input.endDate);
  const range = resolveRange({
    currentDate,
    endDate: customEndDate,
    preset,
    startDate: customStartDate,
  });

  return {
    timezone,
    now: `${currentDate}T00:00:00.000Z`,
    currentDate,
    currentMonth: currentDate.slice(0, 7),
    startDate: range.startDate,
    endDate: range.endDate,
    label: range.label,
  };
}

export async function queryExpenses(
  input: QueryExpensesInput,
): Promise<QueryExpensesResult> {
  const filtered = filterExpenses(input);
  const limit = Math.max(0, input.limit ?? DEFAULT_QUERY_LIMIT);
  const truncated = filtered.length > limit;

  return {
    expenses: filtered.slice(0, limit),
    appliedFilters: input,
    truncated,
  };
}

export async function getSpendingStats(
  input: GetSpendingStatsInput,
): Promise<GetSpendingStatsResult> {
  const cashflowUniverse = filterExpenses({ ...input, includeIncome: true });
  const totalIncomeCents = sumAmounts(cashflowUniverse.filter(isIncome));
  const totalExpenseCents = sumAmounts(
    cashflowUniverse.filter(expense => !isIncome(expense)),
  );
  const netCents = totalIncomeCents - totalExpenseCents;

  const filtered = filterExpenses(input);

  let groups: GetSpendingStatsResult['groups'] = null;
  if (input.groupBy) {
    const grouped = groupRows(filtered, input.groupBy);
    const sorted = sortGroups(input.groupBy, grouped);
    const sliced = sorted.slice(0, input.limit ?? Number.POSITIVE_INFINITY);
    groups = sliced.map(([label, value]) => ({
      label,
      amountCents: value.amountCents,
      transactionCount: value.transactionCount,
      percentageOfTotal:
        totalExpenseCents === 0
          ? null
          : roundPercentage(value.amountCents, totalExpenseCents),
    }));
  }

  return {
    scope: input.scope,
    startDate: input.startDate,
    endDate: input.endDate,
    totalExpenseCents,
    totalIncomeCents,
    netCents,
    savingsRate:
      totalIncomeCents === 0 ? null : roundRatio(netCents, totalIncomeCents),
    savingsRateBasis:
      totalIncomeCents === 0 ? 'unavailable_zero_income' : 'income',
    transactionCount: filtered.length,
    groupBy: input.groupBy,
    groups,
  };
}

export const mockToolExecutors: AgentToolExecutors = {
  getSpendingStats,
  queryExpenses,
  resolveDateRange,
};

export const tools = {
  getSpendingStats: {
    execute: getSpendingStats,
  },
  queryExpenses: {
    execute: queryExpenses,
  },
  resolveDateRange: {
    execute: resolveDateRange,
  },
};

function toExpenseRecord(row: GoldenExpenseRow, index: number): ExpenseRecord {
  const stableId = `golden-expense-${String(index + 1).padStart(4, '0')}`;

  return {
    id: stableId,
    household_id: row.household_id,
    user_id: row.user_id,
    chat_message_id: `golden-message-${String(index + 1).padStart(4, '0')}`,
    amount_cents: row.amount_cents,
    currency: row.currency,
    expense_date: row.expense_date,
    merchant: row.merchant,
    category: row.category,
    note: row.note,
    created_at: `${row.expense_date}T12:00:00.000Z`,
    tags: row.tags,
  };
}

function filterExpenses(input: AgentExpenseFilters): ExpenseRecord[] {
  return filterByScope(expenses, input.scope)
    .filter(expense => isInDateRange(expense, input.startDate, input.endDate))
    .filter(expense => Boolean(input.includeIncome) || !isIncome(expense))
    .filter(expense => matchesCategories(expense, input.categories))
    .filter(expense => matchesMerchants(expense, input.merchants))
    .filter(expense => matchesTags(expense, input.tags));
}

function filterByScope(
  rows: ExpenseRecord[],
  scope: AgentExpenseFilters['scope'],
): ExpenseRecord[] {
  if (scope === 'personal') {
    return rows.filter(row => row.user_id === dataset.metadata.ownerId);
  }

  return rows.filter(row => row.household_id === dataset.metadata.householdId);
}

function isInDateRange(
  expense: ExpenseRecord,
  startDate: string | null,
  endDate: string | null,
): boolean {
  if (startDate && expense.expense_date < startDate) return false;
  if (endDate && expense.expense_date > endDate) return false;
  return true;
}

function matchesCategories(
  expense: ExpenseRecord,
  categories: AgentExpenseFilters['categories'],
): boolean {
  if (!categories?.length) return true;
  const categorySet = new Set(
    categories.map(category => category.toLowerCase()),
  );
  return categorySet.has((expense.category ?? '').toLowerCase());
}

function matchesMerchants(
  expense: ExpenseRecord,
  merchants: AgentExpenseFilters['merchants'],
): boolean {
  if (!merchants?.length) return true;
  const merchantSet = new Set(
    merchants.map(merchant => merchant.toLowerCase()),
  );
  return merchantSet.has((expense.merchant ?? '').toLowerCase());
}

function matchesTags(
  expense: ExpenseRecord,
  tags: AgentExpenseFilters['tags'],
): boolean {
  if (!tags?.length) return true;
  const tagSet = new Set(tags.map(tag => tag.toLowerCase()));
  return expense.tags.some(tag => tagSet.has(tag.toLowerCase()));
}

function groupRows(
  rows: ExpenseRecord[],
  groupBy: SpendingStatsGroupBy,
): Map<string, GroupTotals> {
  const grouped = new Map<string, GroupTotals>();

  rows.forEach(row => {
    const labels = labelsFor(row, groupBy);
    labels.forEach(label => {
      const current = grouped.get(label) ?? {
        amountCents: 0,
        transactionCount: 0,
      };
      grouped.set(label, {
        amountCents: current.amountCents + row.amount_cents,
        transactionCount: current.transactionCount + 1,
      });
    });
  });

  return grouped;
}

function labelsFor(
  row: ExpenseRecord,
  groupBy: SpendingStatsGroupBy,
): string[] {
  if (groupBy === 'month') return [row.expense_date.slice(0, 7)];
  if (groupBy === 'day') return [row.expense_date];
  if (groupBy === 'merchant') return [row.merchant ?? 'Unknown merchant'];
  if (groupBy === 'user') return [userLabel(row.user_id)];
  if (groupBy === 'category') return [row.category ?? 'uncategorized'];
  if (groupBy === 'dayOfWeek') return [dayOfWeekLabel(row.expense_date)];
  if (groupBy === 'tag') {
    return row.tags.length ? row.tags : ['untagged'];
  }
  return [row.category ?? 'uncategorized'];
}

function sortGroups(
  groupBy: SpendingStatsGroupBy,
  grouped: Map<string, GroupTotals>,
): Array<[string, GroupTotals]> {
  return Array.from(grouped.entries()).sort((left, right) => {
    if (groupBy === 'month' || groupBy === 'day') {
      return left[0].localeCompare(right[0]);
    }
    if (groupBy === 'dayOfWeek') {
      return (
        DAY_OF_WEEK_LABELS.indexOf(
          left[0] as (typeof DAY_OF_WEEK_LABELS)[number],
        ) -
        DAY_OF_WEEK_LABELS.indexOf(
          right[0] as (typeof DAY_OF_WEEK_LABELS)[number],
        )
      );
    }

    const byAmount = right[1].amountCents - left[1].amountCents;
    if (byAmount !== 0) return byAmount;
    return left[0].localeCompare(right[0]);
  });
}

function userLabel(userId: string): string {
  if (userId === dataset.metadata.ownerId) return 'Current user';
  if (userId === dataset.metadata.memberId) return 'Household member';
  return userId;
}

function dayOfWeekLabel(isoDate: string): string {
  const day = parseUtcDate(isoDate).getUTCDay();
  const mondayIndex = (day + 6) % 7;
  return DAY_OF_WEEK_LABELS[mondayIndex];
}

function sumAmounts(rows: ExpenseRecord[]): number {
  return rows.reduce((total, row) => total + row.amount_cents, 0);
}

function isIncome(expense: ExpenseRecord): boolean {
  return expense.category === 'income';
}

function compareExpenses(left: ExpenseRecord, right: ExpenseRecord): number {
  const byDate = left.expense_date.localeCompare(right.expense_date);
  if (byDate !== 0) return byDate;
  return left.id.localeCompare(right.id);
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function resolveRange({
  currentDate,
  endDate,
  preset,
  startDate,
}: {
  currentDate: string;
  endDate: string | null;
  preset: ResolveDateRangeInput['preset'];
  startDate: string | null;
}): { startDate: string; endDate: string; label: string } {
  const date = parseUtcDate(currentDate);

  if (preset === 'today') {
    return { startDate: currentDate, endDate: currentDate, label: 'Today' };
  }
  if (preset === 'yesterday') {
    const yesterday = addUtcDays(date, -1);
    return {
      startDate: formatUtcDate(yesterday),
      endDate: formatUtcDate(yesterday),
      label: 'Yesterday',
    };
  }
  if (preset === 'this_week' || preset === 'last_week') {
    const weekStart = startOfUtcWeek(date);
    const start =
      preset === 'this_week' ? weekStart : addUtcDays(weekStart, -7);
    const end =
      preset === 'this_week' ? addUtcDays(start, 6) : addUtcDays(weekStart, -1);
    return {
      startDate: formatUtcDate(start),
      endDate: formatUtcDate(end),
      label: preset === 'this_week' ? 'This week' : 'Last week',
    };
  }
  if (preset === 'this_month' || preset === 'last_month') {
    const monthOffset = preset === 'this_month' ? 0 : -1;
    const start = startOfUtcMonth(date, monthOffset);
    return {
      startDate: formatUtcDate(start),
      endDate: formatUtcDate(endOfUtcMonth(start)),
      label: preset === 'this_month' ? 'This month' : 'Last month',
    };
  }
  if (preset === 'last_3_months') {
    const start = startOfUtcMonth(date, -2);
    return {
      startDate: formatUtcDate(start),
      endDate: formatUtcDate(endOfUtcMonth(date)),
      label: 'Last 3 months',
    };
  }
  if (preset === 'this_year' || preset === 'last_year') {
    const year = date.getUTCFullYear() + (preset === 'this_year' ? 0 : -1);
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: preset === 'this_year' ? 'This year' : 'Last year',
    };
  }

  return {
    startDate: startDate ?? dataset.metadata.startDate,
    endDate: endDate ?? currentDate,
    label: 'Custom range',
  };
}

function parseUtcDate(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return addUtcDays(date, -daysSinceMonday);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcMonth(date: Date, monthOffset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1),
  );
}

function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundPercentage(amount: number, total: number): number {
  return Math.round((amount / total) * 10000) / 100;
}

function roundRatio(amount: number, total: number): number {
  return Math.round((amount / total) * 10000) / 10000;
}
