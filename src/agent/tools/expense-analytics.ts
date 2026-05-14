import type { ExpenseRecord } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import type {
  AgentExpenseFilters,
  QueryExpensesInput,
  QueryExpensesResult,
  ResolveDateRangeInput,
  ResolveDateRangeResult,
} from '@/agent/types';

export const DEFAULT_TIMEZONE = 'America/Bogota';
export const DEFAULT_QUERY_LIMIT = 50;
export const DEFAULT_HISTORY_START_DATE = '1970-01-01';

export type ExpenseAnalyticsContext = {
  currency: SupportedCurrency;
  currentUserId: string;
  householdId: string | null;
};

/**
 * Resolves the agent's date-range tool presets into concrete ISO dates.
 *
 * Both the Supabase executor and any future fixture-based callers use this
 * helper so prompts such as "this month" or "last 3 months" produce the same
 * `resolveDateRange` result shape regardless of caller.
 */
export function resolveDateRangeFromCurrentDate(
  input: ResolveDateRangeInput,
  {
    currentDate,
    datasetStartDate = DEFAULT_HISTORY_START_DATE,
    defaultTimezone = DEFAULT_TIMEZONE,
  }: {
    currentDate: string;
    datasetStartDate?: string;
    defaultTimezone?: string;
  },
): ResolveDateRangeResult {
  const timezone = input.timezone ?? defaultTimezone;
  const preset = input.preset ?? 'custom';
  const customStartDate = normalizeDate(input.startDate);
  const customEndDate = normalizeDate(input.endDate);
  const range = resolveRange({
    currentDate,
    datasetStartDate,
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

/**
 * Builds the `queryExpenses` tool response from already-loaded expense rows.
 *
 * The Supabase executor fetches RLS-visible rows with the logged-in user's
 * token and then delegates to this shared helper for the tool-contract
 * semantics: scope, dates, categories, merchants, tags, income exclusion,
 * default limit, and truncation.
 */
export function buildQueryExpensesResult({
  context,
  input,
  rows,
}: {
  context: ExpenseAnalyticsContext;
  input: QueryExpensesInput;
  rows: ExpenseRecord[];
}): QueryExpensesResult {
  const filtered = filterExpenses(rows, context, input);
  const limit = Math.max(0, input.limit ?? DEFAULT_QUERY_LIMIT);
  const truncated = filtered.length > limit;

  return {
    currency: context.currency,
    expenses: filtered.slice(0, limit),
    appliedFilters: input,
    truncated,
  };
}

/**
 * Provides stable chronological ordering for expenses.
 *
 * The Supabase executor sorts rows with this comparator before handing them to
 * the shared builders so pagination and truncation stay deterministic.
 */
export function compareExpenses(
  left: ExpenseRecord,
  right: ExpenseRecord,
): number {
  const byDate = left.expense_date.localeCompare(right.expense_date);
  if (byDate !== 0) return byDate;
  return left.id.localeCompare(right.id);
}

/**
 * Applies the common agent-tool filters to a set of candidate rows.
 *
 * RLS remains the security boundary in production; these filters express the
 * user's requested intent after the database has already limited visibility.
 */
function filterExpenses(
  rows: ExpenseRecord[],
  context: ExpenseAnalyticsContext,
  input: AgentExpenseFilters,
): ExpenseRecord[] {
  return rows
    .filter(expense => matchesScope(expense, context, input.scope))
    .filter(expense => isInDateRange(expense, input.startDate, input.endDate))
    .filter(expense => Boolean(input.includeIncome) || !isIncome(expense))
    .filter(expense => matchesCategories(expense, input.categories))
    .filter(expense => matchesMerchants(expense, input.merchants))
    .filter(expense => matchesTags(expense, input.tags));
}

function matchesScope(
  expense: ExpenseRecord,
  context: ExpenseAnalyticsContext,
  scope: AgentExpenseFilters['scope'],
): boolean {
  if (scope === 'personal') {
    return expense.user_id === context.currentUserId;
  }
  return Boolean(
    context.householdId && expense.household_id === context.householdId,
  );
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

function isIncome(expense: ExpenseRecord): boolean {
  return expense.category === 'income';
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

/**
 * Implements `resolveDateRange` preset behavior against a supplied current date.
 *
 * The caller supplies `currentDate` so tests, mocks, and production can all be
 * deterministic while still using the same calendar math.
 */
function resolveRange({
  currentDate,
  datasetStartDate,
  endDate,
  preset,
  startDate,
}: {
  currentDate: string;
  datasetStartDate: string;
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
    startDate: startDate ?? datasetStartDate,
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
