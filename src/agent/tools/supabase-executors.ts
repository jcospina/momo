import { formatCurrencyAmount } from '@helpers/currency';
import type { ExpenseRecord } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentAuthContext, AgentContext } from '@/agent/context';
import type { AgentToolExecutors } from '@/agent/tools/tools';
import type {
  GetSpendingStatsInput,
  GetSpendingStatsResult,
  QueryExpensesInput,
  QueryExpensesResult,
  ResolveDateRangeInput,
  ResolveDateRangeResult,
  SpendingStatsTagEntry,
} from '@/agent/types';
import {
  buildQueryExpensesResult,
  compareExpenses,
  DEFAULT_TIMEZONE,
  type ExpenseAnalyticsContext,
  resolveDateRangeFromCurrentDate,
} from './expense-analytics';
import { createAgentSupabaseClient } from './supabase-client';

const EXPENSE_SELECT =
  'id, household_id, user_id, chat_message_id, amount_cents, currency, expense_date, merchant, category, note, created_at, tags';
const SUPABASE_PAGE_SIZE = 1000;

type HouseholdMembership = {
  household_id: string;
};

function requireAuth(context: AgentContext): AgentAuthContext {
  if (!context.auth) {
    throw new Error('Agent auth context is required for Supabase tools');
  }
  return context.auth;
}

export async function resolveDateRange(
  input: ResolveDateRangeInput,
): Promise<ResolveDateRangeResult> {
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const currentDate = input.referenceDate
    ? input.referenceDate.slice(0, 10)
    : currentDateInTimezone(timezone);

  return resolveDateRangeFromCurrentDate(input, {
    currentDate,
    defaultTimezone: timezone,
  });
}

export async function queryExpenses(
  input: QueryExpensesInput,
  context: AgentContext,
): Promise<QueryExpensesResult> {
  const auth = requireAuth(context);
  const supabase = createAgentSupabaseClient(auth);
  const householdId = await resolveHouseholdId({
    auth,
    inputScope: input.scope,
    supabase,
  });
  const rows = await fetchScopeRows({ auth, householdId, input, supabase });

  return buildQueryExpensesResult({
    context: getAnalyticsContext({ auth, context, householdId }),
    input,
    rows,
  });
}

export async function getSpendingStats(
  input: GetSpendingStatsInput,
  context: AgentContext,
): Promise<GetSpendingStatsResult> {
  const auth = requireAuth(context);
  const supabase = createAgentSupabaseClient(auth);
  const householdId = await resolveHouseholdId({
    auth,
    inputScope: input.scope,
    supabase,
  });

  if (input.scope === 'household' && !householdId) {
    return emptySpendingStatsResult({ context, input });
  }

  const { data, error } = await supabase.rpc('get_agent_spending_stats', {
    p_categories: input.categories,
    p_currency: context.currency,
    p_end_date: input.endDate,
    p_group_by: input.groupBy,
    p_household_id: householdId,
    p_include_income: Boolean(input.includeIncome),
    p_limit: input.limit,
    p_merchants: input.merchants,
    p_scope: input.scope,
    p_start_date: input.startDate,
    p_tags: input.tags,
  });

  if (error) {
    console.error('agent spending stats rpc failed', error);
    return emptySpendingStatsResult({ context, input });
  }

  return normalizeSpendingStatsResult({ context, data, input });
}

export const productionToolExecutors: AgentToolExecutors = {
  getSpendingStats,
  queryExpenses,
  resolveDateRange: async input => resolveDateRange(input),
};

async function resolveHouseholdId({
  auth,
  inputScope,
  supabase,
}: {
  auth: AgentAuthContext;
  inputScope: QueryExpensesInput['scope'];
  supabase: SupabaseClient;
}): Promise<string | null> {
  if (inputScope === 'personal') {
    return null;
  }

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', auth.userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('agent household membership lookup failed', error);
    return null;
  }

  return ((data as HouseholdMembership | null) ?? null)?.household_id ?? null;
}

async function fetchScopeRows({
  auth,
  householdId,
  input,
  supabase,
}: {
  auth: AgentAuthContext;
  householdId: string | null;
  input: QueryExpensesInput | GetSpendingStatsInput;
  supabase: SupabaseClient;
}): Promise<ExpenseRecord[]> {
  if (input.scope === 'household' && !householdId) {
    return [];
  }

  const rows: ExpenseRecord[] = [];
  let offset = 0;

  while (true) {
    const query = buildScopeRowsQuery({ auth, householdId, input, supabase });
    const { data, error } = await query.range(
      offset,
      offset + SUPABASE_PAGE_SIZE - 1,
    );

    if (error) {
      console.error('agent expense query failed', error);
      return [];
    }

    const page = (data as ExpenseRecord[] | null) ?? [];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }
    offset += SUPABASE_PAGE_SIZE;
  }

  return rows.sort(compareExpenses);
}

function buildScopeRowsQuery({
  auth,
  householdId,
  input,
  supabase,
}: {
  auth: AgentAuthContext;
  householdId: string | null;
  input: QueryExpensesInput | GetSpendingStatsInput;
  supabase: SupabaseClient;
}) {
  let query = supabase.from('expenses').select(EXPENSE_SELECT);

  if (input.scope === 'personal') {
    query = query.eq('user_id', auth.userId);
  } else {
    query = query.eq('household_id', householdId);
  }

  if (input.startDate) {
    query = query.gte('expense_date', input.startDate);
  }
  if (input.endDate) {
    query = query.lte('expense_date', input.endDate);
  }
  if (!input.includeIncome) {
    query = query.neq('category', 'income');
  }
  if (input.categories?.length) {
    query = query.in('category', input.categories);
  }
  if (input.tags?.length) {
    query = query.overlaps(
      'tags',
      input.tags.map(tag => tag.toLowerCase()),
    );
  }

  return query
    .order('expense_date', { ascending: true })
    .order('id', { ascending: true });
}

function getAnalyticsContext({
  auth,
  context,
  householdId,
}: {
  auth: AgentAuthContext;
  context: AgentContext;
  householdId: string | null;
}): ExpenseAnalyticsContext {
  return {
    currency: context.currency,
    currentUserId: auth.userId,
    householdId,
  };
}

function emptySpendingStatsResult({
  context,
  input,
}: {
  context: AgentContext;
  input: GetSpendingStatsInput;
}): GetSpendingStatsResult {
  const zero = formatCurrencyAmount(0, context.currency);
  return {
    currency: context.currency,
    scope: input.scope,
    startDate: input.startDate,
    endDate: input.endDate,
    totalExpenseCents: 0,
    totalExpenseFormatted: zero,
    totalIncomeCents: 0,
    totalIncomeFormatted: zero,
    netCents: 0,
    netFormatted: zero,
    savingsRate: null,
    savingsRateBasis: 'unavailable_zero_income',
    transactionCount: 0,
    groupBy: input.groupBy,
    groups: input.groupBy ? [] : null,
    tags: [],
  };
}

function normalizeSpendingStatsResult({
  context,
  data,
  input,
}: {
  context: AgentContext;
  data: unknown;
  input: GetSpendingStatsInput;
}): GetSpendingStatsResult {
  const result = (data ?? {}) as Partial<GetSpendingStatsResult>;
  const { currency } = context;
  const totalExpenseCents = Number(result.totalExpenseCents ?? 0);
  const totalIncomeCents = Number(result.totalIncomeCents ?? 0);
  const netCents = Number(result.netCents ?? 0);

  return {
    currency,
    scope: input.scope,
    startDate: input.startDate,
    endDate: input.endDate,
    totalExpenseCents,
    totalExpenseFormatted: formatCurrencyAmount(totalExpenseCents, currency),
    totalIncomeCents,
    totalIncomeFormatted: formatCurrencyAmount(totalIncomeCents, currency),
    netCents,
    netFormatted: formatCurrencyAmount(netCents, currency),
    savingsRate:
      typeof result.savingsRate === 'number' ? result.savingsRate : null,
    savingsRateBasis:
      result.savingsRateBasis === 'income'
        ? 'income'
        : 'unavailable_zero_income',
    transactionCount: Number(result.transactionCount ?? 0),
    groupBy: input.groupBy,
    groups: Array.isArray(result.groups)
      ? result.groups.map(group => {
          const amountCents = Number(group.amountCents ?? 0);
          return {
            label: String(group.label),
            amountCents,
            amountFormatted: formatCurrencyAmount(amountCents, currency),
            transactionCount: Number(group.transactionCount ?? 0),
            percentageOfTotal:
              typeof group.percentageOfTotal === 'number'
                ? group.percentageOfTotal
                : null,
            tags: normalizeTagEntries(group.tags, currency),
          };
        })
      : input.groupBy
        ? []
        : null,
    tags: normalizeTagEntries(result.tags, currency),
  };
}

function normalizeTagEntries(
  value: unknown,
  currency: SupportedCurrency,
): SpendingStatsTagEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map(entry => {
    const amountCents = Number(entry.amountCents ?? 0);
    return {
      tag: String(entry.tag ?? ''),
      count: Number(entry.count ?? 0),
      amountCents,
      amountFormatted: formatCurrencyAmount(amountCents, currency),
    };
  });
}

function currentDateInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone: timezone,
      year: 'numeric',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    const day = parts.find(part => part.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    return currentDateInTimezone(DEFAULT_TIMEZONE);
  }

  return new Date().toISOString().slice(0, 10);
}
