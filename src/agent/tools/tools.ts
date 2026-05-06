import { EXPENSE_CATEGORIES } from '@lib-types/expenses';
import { tool } from 'ai';
import { z } from 'zod';
import type { AgentContext } from '@/agent/context';
import { productionToolExecutors } from '@/agent/tools/supabase-executors';
import type {
  GetSpendingStatsInput,
  GetSpendingStatsResult,
  QueryExpensesInput,
  QueryExpensesResult,
  ResolveDateRangeInput,
  ResolveDateRangeResult,
} from '@/agent/types';
import {
  AGENT_EXPENSE_SCOPES,
  DATE_RANGE_PRESETS,
  SPENDING_STATS_GROUP_BY,
} from '@/agent/types';

const UNIQUE_EXPENSE_CATEGORIES = Array.from(new Set(EXPENSE_CATEGORIES)) as [
  (typeof EXPENSE_CATEGORIES)[number],
  ...(typeof EXPENSE_CATEGORIES)[number][],
];

export { productionToolExecutors };

export type AgentToolExecutors = {
  resolveDateRange: (
    input: ResolveDateRangeInput,
    context: AgentContext,
  ) => Promise<ResolveDateRangeResult>;
  queryExpenses: (
    input: QueryExpensesInput,
    context: AgentContext,
  ) => Promise<QueryExpensesResult>;
  getSpendingStats: (
    input: GetSpendingStatsInput,
    context: AgentContext,
  ) => Promise<GetSpendingStatsResult>;
};

export function buildAgentTools(
  executors: AgentToolExecutors,
  context: AgentContext,
) {
  return {
    resolveDateRange: tool({
      title: 'get date range',
      description:
        'Get the dates for a time period. Use this when the user says things like this month, last month, last 3 months, this year, last week, or gives a custom range.',
      inputSchema: z.object({
        timezone: z
          .string()
          .describe(
            'Timezone used to resolve the range, for example America/Bogota.',
          )
          .nullable(),
        referenceDate: z
          .string()
          .describe('nullable ISO date or datetime to use instead of now.')
          .nullable(),
        preset: z
          .enum(DATE_RANGE_PRESETS)
          .describe('Relative time period to resolve into dates.')
          .nullable(),
        startDate: z
          .string()
          .describe('nullable start date for a custom range.')
          .nullable(),
        endDate: z
          .string()
          .describe('nullable end date for a custom range.')
          .nullable(),
      }),
      execute: async (input: ResolveDateRangeInput) =>
        executors.resolveDateRange(input, context),
    }),
    queryExpenses: tool({
      title: 'query expenses',
      description: [
        'List individual expense rows for the given scope and filters.',
        'Use this when the user wants examples, recent transactions, a sample of merchants, or anything that needs row-level detail.',
        "Do NOT use this to compute totals or breakdowns — call getSpendingStats instead, which is cheaper and won't truncate.",
        'Results are bounded by `limit`; when more rows existed than the limit, `truncated` is true.',
        'The result includes a top-level `currency` field that indicates how to interpret `amount_cents` on each row.',
      ].join(' '),
      inputSchema: z.object({
        scope: z
          .enum(AGENT_EXPENSE_SCOPES)
          .describe(
            "personal = only the current user's own expenses; household = all shared household expenses.",
          ),
        startDate: z
          .string()
          .describe(
            'Inclusive start date (YYYY-MM-DD). Null to leave open-ended.',
          )
          .nullable(),
        endDate: z
          .string()
          .describe(
            'Inclusive end date (YYYY-MM-DD). Null to leave open-ended.',
          )
          .nullable(),
        categories: z
          .array(z.enum(UNIQUE_EXPENSE_CATEGORIES))
          .describe('Filter to these categories. Null = all categories.')
          .nullable(),
        merchants: z
          .array(z.string())
          .describe(
            'Filter to these merchants (case-insensitive exact match). Null = all merchants.',
          )
          .nullable(),
        tags: z
          .array(z.string())
          .describe(
            'Filter to expenses that contain any of these tags. Null = all tags.',
          )
          .nullable(),
        includeIncome: z
          .boolean()
          .describe(
            'If true, include income entries in the result. Default behavior (null/false) is to exclude income.',
          )
          .nullable(),
        limit: z
          .number()
          .int()
          .positive()
          .describe(
            'Maximum number of expense rows to return. Defaults to 50. Keep this small — agents should reason over a sample, not the full ledger.',
          )
          .nullable(),
      }),
      execute: async (input: QueryExpensesInput) =>
        executors.queryExpenses(input, context),
    }),
    getSpendingStats: tool({
      title: 'get spending stats',
      description: [
        'Get aggregated spending numbers for the given scope and filters.',
        'By default this is expense-only: use it for questions like "how much did I spend" without mentioning income, net, or savings in the answer.',
        'Set `includeIncome` to true only when the user asks about income, cashflow, net, savings, or explicitly wants income included.',
        'The result includes a `currency` field that indicates how to interpret amount fields.',
        'Pass `groupBy` to also receive a per-group breakdown (sorted from largest amount to smallest, except month/day/dayOfWeek which sort chronologically).',
        'To compare two periods, call this twice with different date ranges and reason over the deltas — there is no separate compare tool.',
        "Note: when `groupBy` is `tag`, a transaction with multiple tags is counted in each tag's group, so per-group percentages can sum to more than 100%.",
      ].join(' '),
      inputSchema: z.object({
        scope: z
          .enum(AGENT_EXPENSE_SCOPES)
          .describe(
            "personal = only the current user's own expenses; household = all shared household expenses.",
          ),
        startDate: z
          .string()
          .describe(
            'Inclusive start date (YYYY-MM-DD). Null to leave open-ended.',
          )
          .nullable(),
        endDate: z
          .string()
          .describe(
            'Inclusive end date (YYYY-MM-DD). Null to leave open-ended.',
          )
          .nullable(),
        categories: z
          .array(z.enum(UNIQUE_EXPENSE_CATEGORIES))
          .describe('Filter to these categories. Null = all categories.')
          .nullable(),
        merchants: z
          .array(z.string())
          .describe(
            'Filter to these merchants (case-insensitive exact match). Null = all merchants.',
          )
          .nullable(),
        tags: z
          .array(z.string())
          .describe(
            'Filter to expenses that contain any of these tags. Null = all tags.',
          )
          .nullable(),
        includeIncome: z
          .boolean()
          .describe(
            'If true, include income entries for income, cashflow, net, or savings questions. Null/false means expense-only and should be the default for spending questions.',
          )
          .nullable(),
        groupBy: z
          .enum(SPENDING_STATS_GROUP_BY)
          .describe(
            'Dimension to break down by. Null returns only the top-level totals (no `groups` array).',
          )
          .nullable(),
        limit: z
          .number()
          .int()
          .positive()
          .describe(
            'Maximum number of groups to return. Null returns all groups.',
          )
          .nullable(),
      }),
      execute: async (input: GetSpendingStatsInput) =>
        executors.getSpendingStats(input, context),
    }),
  };
}
