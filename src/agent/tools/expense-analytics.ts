import type { ExpenseRecord } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import type {
  AgentExpenseFilters,
  GetSpendingStatsInput,
  GetSpendingStatsResult,
  QueryExpensesInput,
  QueryExpensesResult,
  ResolveDateRangeInput,
  ResolveDateRangeResult,
  SpendingStatsGroupBy,
  SpendingStatsTagEntry,
} from '@/agent/types';

export const DEFAULT_TIMEZONE = 'America/Bogota';
export const DEFAULT_QUERY_LIMIT = 50;
export const DEFAULT_HISTORY_START_DATE = '1970-01-01';
const TAG_TOPK = 10;

const DAY_OF_WEEK_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type ExpenseAnalyticsContext = {
  currency: SupportedCurrency;
  currentUserId: string;
  householdId: string | null;
  otherUserId?: string | null;
};

/**
 * Resolves the agent's date-range tool presets into concrete ISO dates.
 *
 * Mock and Supabase executors both call this helper so prompts such as
 * "this month" or "last 3 months" produce the same `resolveDateRange` result
 * shape regardless of whether rows come from fixtures or the database.
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
 * The real executor is responsible for fetching RLS-visible rows with the
 * logged-in user's Supabase token; this shared layer applies the tool contract
 * semantics that should not drift between mocks and production: scope, dates,
 * categories, merchants, tags, income exclusion, default limit, and truncation.
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
 * Builds the `getSpendingStats` tool response from already-loaded expense rows.
 *
 * This is the fixture/mock aggregation layer. Production Supabase stats use a
 * SQL RPC so filtering and grouping happen in Postgres under RLS, but mocks keep
 * this TypeScript path so evals remain deterministic and database-free.
 */
export function buildSpendingStatsResult({
  context,
  input,
  rows,
}: {
  context: ExpenseAnalyticsContext;
  input: GetSpendingStatsInput;
  rows: ExpenseRecord[];
}): GetSpendingStatsResult {
  const includeIncome = Boolean(input.includeIncome);
  const cashflowUniverse = includeIncome
    ? filterExpenses(rows, context, {
        ...input,
        includeIncome: true,
      })
    : filterExpenses(rows, context, input);
  const totalIncomeCents = sumAmounts(cashflowUniverse.filter(isIncome));
  const totalExpenseCents = sumAmounts(
    cashflowUniverse.filter(expense => !isIncome(expense)),
  );
  const netCents = includeIncome ? totalIncomeCents - totalExpenseCents : 0;
  const filtered = filterExpenses(rows, context, input);

  const tagFreq = computeTagFreq(filtered);
  const assignments: PrimaryTagAssignment[] = filtered.map(expense => ({
    expense,
    primaryTag: pickPrimaryTag(expense.tags, tagFreq),
  }));

  let groups: GetSpendingStatsResult['groups'] = null;
  if (input.groupBy) {
    const grouped = groupRows(filtered, input.groupBy, context);
    const sorted = sortGroups(input.groupBy, grouped);
    const sliced = sorted.slice(0, input.limit ?? Number.POSITIVE_INFINITY);
    const assignmentsByLabel = new Map<string, PrimaryTagAssignment[]>();
    for (const assignment of assignments) {
      const labels = labelsFor(assignment.expense, input.groupBy, context);
      for (const label of labels) {
        const list = assignmentsByLabel.get(label) ?? [];
        list.push(assignment);
        assignmentsByLabel.set(label, list);
      }
    }
    groups = sliced.map(([label, value]) => ({
      label,
      amountCents: value.amountCents,
      transactionCount: value.transactionCount,
      percentageOfTotal:
        totalExpenseCents === 0
          ? null
          : roundPercentage(value.amountCents, totalExpenseCents),
      tags: buildTagEntries(assignmentsByLabel.get(label) ?? []),
    }));
  }

  const globalTags = buildTagEntries(assignments);

  return {
    currency: context.currency,
    scope: input.scope,
    startDate: input.startDate,
    endDate: input.endDate,
    totalExpenseCents,
    totalIncomeCents,
    netCents,
    savingsRate:
      includeIncome && totalIncomeCents !== 0
        ? roundRatio(netCents, totalIncomeCents)
        : null,
    savingsRateBasis:
      includeIncome && totalIncomeCents !== 0
        ? 'income'
        : 'unavailable_zero_income',
    transactionCount: filtered.length,
    groupBy: input.groupBy,
    groups,
    tags: globalTags,
  };
}

type PrimaryTagAssignment = {
  expense: ExpenseRecord;
  primaryTag: string | null;
};

function pickPrimaryTag(
  tags: string[],
  tagFreq: Map<string, number>,
): string | null {
  if (!tags.length) return null;
  let best: string | null = null;
  let bestKey: [number, number, string] | null = null;
  for (const tag of tags) {
    const freq = tagFreq.get(tag) ?? 0;
    const key: [number, number, string] = [freq, tag.length, tag];
    if (
      !bestKey ||
      key[0] > bestKey[0] ||
      (key[0] === bestKey[0] && key[1] > bestKey[1]) ||
      (key[0] === bestKey[0] && key[1] === bestKey[1] && key[2] < bestKey[2])
    ) {
      best = tag;
      bestKey = key;
    }
  }
  return best;
}

function computeTagFreq(rows: ExpenseRecord[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const tag of row.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
  }
  return freq;
}

function buildTagEntries(
  assignments: PrimaryTagAssignment[],
): SpendingStatsTagEntry[] {
  const totals = new Map<string, { count: number; amountCents: number }>();
  for (const { expense, primaryTag } of assignments) {
    if (!primaryTag) continue;
    const current = totals.get(primaryTag) ?? { count: 0, amountCents: 0 };
    totals.set(primaryTag, {
      count: current.count + 1,
      amountCents: current.amountCents + expense.amount_cents,
    });
  }
  const entries: SpendingStatsTagEntry[] = Array.from(totals.entries()).map(
    ([tag, value]) => ({
      tag,
      count: value.count,
      amountCents: value.amountCents,
    }),
  );
  entries.sort((a, b) => {
    if (b.amountCents !== a.amountCents) return b.amountCents - a.amountCents;
    return a.tag.localeCompare(b.tag);
  });
  return entries.slice(0, TAG_TOPK);
}

/**
 * Provides stable chronological ordering for expenses.
 *
 * Row-returning executors use this before handing expenses to shared builders
 * so pagination and truncation stay deterministic across fixture data and
 * Supabase result sets.
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

/**
 * Preserves the tool's scope semantics.
 *
 * `personal` means the current user's own rows, including rows attached to a
 * household context. `household` means rows in the active household that are
 * visible to the caller through membership and RLS.
 */
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

/**
 * Checks inclusive ISO date bounds used by both query and stats tools.
 */
function isInDateRange(
  expense: ExpenseRecord,
  startDate: string | null,
  endDate: string | null,
): boolean {
  if (startDate && expense.expense_date < startDate) return false;
  if (endDate && expense.expense_date > endDate) return false;
  return true;
}

/**
 * Matches category filters case-insensitively while preserving stored labels.
 */
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

/**
 * Matches merchant filters case-insensitively.
 *
 * Supabase executors intentionally keep this check in shared code because the
 * mock behavior is exact, case-insensitive matching rather than a database
 * search or fuzzy merchant lookup.
 */
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

/**
 * Matches any requested tag case-insensitively.
 *
 * A row passes when at least one stored tag intersects with the requested tag
 * set, matching the agent contract used by evals.
 */
function matchesTags(
  expense: ExpenseRecord,
  tags: AgentExpenseFilters['tags'],
): boolean {
  if (!tags?.length) return true;
  const tagSet = new Set(tags.map(tag => tag.toLowerCase()));
  return expense.tags.some(tag => tagSet.has(tag.toLowerCase()));
}

type GroupTotals = {
  amountCents: number;
  transactionCount: number;
};

/**
 * Accumulates rows into group totals for the `getSpendingStats` tool.
 *
 * Tag grouping can emit multiple labels per row, so the grouping step delegates
 * label selection to `labelsFor` instead of assuming one bucket per expense.
 */
function groupRows(
  rows: ExpenseRecord[],
  groupBy: SpendingStatsGroupBy,
  context: ExpenseAnalyticsContext,
): Map<string, GroupTotals> {
  const grouped = new Map<string, GroupTotals>();

  rows.forEach(row => {
    const labels = labelsFor(row, groupBy, context);
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

/**
 * Returns the display bucket label or labels for a grouped stats row.
 *
 * These labels are part of the tool output consumed by the agent, so they stay
 * centralized here instead of being duplicated in each executor.
 */
function labelsFor(
  row: ExpenseRecord,
  groupBy: SpendingStatsGroupBy,
  context: ExpenseAnalyticsContext,
): string[] {
  if (groupBy === 'month') return [row.expense_date.slice(0, 7)];
  if (groupBy === 'day') return [row.expense_date];
  if (groupBy === 'merchant') return [row.merchant ?? 'Unknown merchant'];
  if (groupBy === 'user') return [userLabel(row.user_id, context)];
  if (groupBy === 'category') return [row.category ?? 'uncategorized'];
  if (groupBy === 'dayOfWeek') return [dayOfWeekLabel(row.expense_date)];
  return [row.category ?? 'uncategorized'];
}

/**
 * Sorts grouped stats with tool-specific ordering rules.
 *
 * Date groups are chronological, weekday groups follow Monday-first calendar
 * order, and all other groups are ranked by descending spend with label
 * alphabetical tie-breaks.
 */
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

/**
 * Converts user IDs into privacy-preserving group labels for agent output.
 */
function userLabel(userId: string, context: ExpenseAnalyticsContext): string {
  if (userId === context.currentUserId) return 'Current user';
  if (context.otherUserId && userId === context.otherUserId) {
    return 'Household member';
  }
  return 'Household member';
}

/**
 * Converts an ISO expense date into the Monday-first weekday label used by stats.
 */
function dayOfWeekLabel(isoDate: string): string {
  const day = parseUtcDate(isoDate).getUTCDay();
  const mondayIndex = (day + 6) % 7;
  return DAY_OF_WEEK_LABELS[mondayIndex];
}

/**
 * Totals signed cent amounts for rows that already passed tool filtering.
 */
function sumAmounts(rows: ExpenseRecord[]): number {
  return rows.reduce((total, row) => total + row.amount_cents, 0);
}

/**
 * Identifies income rows by the canonical category used by the tool fixtures
 * and Supabase expense records.
 */
function isIncome(expense: ExpenseRecord): boolean {
  return expense.category === 'income';
}

/**
 * Normalizes nullable date inputs to `YYYY-MM-DD` strings.
 */
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

/**
 * Parses an ISO date as midnight UTC to avoid host-timezone drift in presets.
 */
function parseUtcDate(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
}

/**
 * Returns the Monday start for the UTC week containing the supplied date.
 */
function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return addUtcDays(date, -daysSinceMonday);
}

/**
 * Adds calendar days in UTC without relying on local timezone behavior.
 */
function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Returns the first day of a UTC month, optionally offset from the input month.
 */
function startOfUtcMonth(date: Date, monthOffset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1),
  );
}

/**
 * Returns the last day of the UTC month containing the supplied date.
 */
function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

/**
 * Formats a UTC date object as the ISO date string used in tool payloads.
 */
function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Converts a grouped amount into a two-decimal percentage of total spend.
 */
function roundPercentage(amount: number, total: number): number {
  return Math.round((amount / total) * 10000) / 100;
}

/**
 * Converts a ratio such as net-over-income into a four-decimal value.
 */
function roundRatio(amount: number, total: number): number {
  return Math.round((amount / total) * 10000) / 10000;
}
