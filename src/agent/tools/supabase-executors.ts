import type { ExpenseRecord } from '@lib-types/expenses';
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
} from '@/agent/types';
import {
  buildQueryExpensesResult,
  buildSpendingStatsResult,
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
  const rows = await fetchScopeRows({ auth, householdId, input, supabase });

  return buildSpendingStatsResult({
    context: getAnalyticsContext({ auth, context, householdId }),
    input,
    rows,
  });
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
