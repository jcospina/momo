import { tool } from 'ai';
import { z } from 'zod';
import type {
  CompareSpendingPeriodsInput,
  CompareSpendingPeriodsResult,
  FindRecurringExpenseCandidatesInput,
  FindRecurringExpenseCandidatesResult,
  GetCashflowSummaryInput,
  GetCashflowSummaryResult,
  GetExpensesInput,
  GetExpensesResult,
  GetSpendingSummaryInput,
  GetSpendingSummaryResult,
  ResolveDateRangeInput,
  ResolveDateRangeResult,
} from '@/agent/types';
import {
  AGENT_EXPENSE_SCOPES,
  DATE_RANGE_PRESETS,
  SPENDING_COMPARISON_BREAKDOWN_BY,
  SPENDING_SUMMARY_GROUP_BY,
} from '@/agent/types';

function notImplemented(toolName: string): never {
  throw new Error(`${toolName} is not implemented yet`);
}

export const tools = {
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
        .optional(),
      referenceDate: z
        .string()
        .describe('Optional ISO date or datetime to use instead of now.')
        .optional(),
      preset: z
        .enum(DATE_RANGE_PRESETS)
        .describe('Relative time period to resolve into dates.')
        .optional(),
      startDate: z
        .string()
        .describe('Optional start date for a custom range.')
        .optional(),
      endDate: z
        .string()
        .describe('Optional end date for a custom range.')
        .optional(),
    }),
    execute: async (
      _input: ResolveDateRangeInput,
    ): Promise<ResolveDateRangeResult> => {
      return notImplemented('resolveDateRange');
    },
  }),
  getExpenses: tool({
    title: 'get expenses',
    description:
      'Get a list of expenses for a given scope. Use this when the user asks about expenses in general, wants examples, or asks about a given time period, category, or merchant.',
    inputSchema: z.object({
      scope: z
        .enum(AGENT_EXPENSE_SCOPES)
        .describe(
          "The scope of the expenses to retrieve. Personal means the user's own expenses. Household means expenses shared with the household.",
        ),
      startDate: z
        .string()
        .describe('Optional start date for the period.')
        .optional(),
      endDate: z
        .string()
        .describe('Optional end date for the period.')
        .optional(),
      limit: z
        .number()
        .int()
        .positive()
        .describe('Maximum number of expenses to return.')
        .optional(),
      categories: z
        .array(z.string())
        .describe('Optional categories to filter by.')
        .optional(),
      merchants: z
        .array(z.string())
        .describe('Optional merchants to filter by.')
        .optional(),
      includeIncome: z
        .boolean()
        .describe('Whether income entries should also be included.')
        .optional(),
    }),
    execute: async (_input: GetExpensesInput): Promise<GetExpensesResult> => {
      return notImplemented('getExpenses');
    },
  }),
  getSpendingSummary: tool({
    title: 'get spending summary',
    description:
      'Get how much was spent in a period, optionally grouped by month, category, merchant, day, or user. Use this for questions like where the user spent the most, which month was highest, or what stands out.',
    inputSchema: z.object({
      scope: z
        .enum(AGENT_EXPENSE_SCOPES)
        .describe('Scope to summarize: personal or household.'),
      startDate: z.string().describe('Start date for the period.'),
      endDate: z.string().describe('End date for the period.'),
      groupBy: z
        .enum(SPENDING_SUMMARY_GROUP_BY)
        .describe('How to group the results.')
        .optional(),
      limit: z
        .number()
        .int()
        .positive()
        .describe('Maximum number of grouped results to return.')
        .optional(),
      includeIncome: z
        .boolean()
        .describe('Whether income entries should also be included.')
        .optional(),
    }),
    execute: async (
      _input: GetSpendingSummaryInput,
    ): Promise<GetSpendingSummaryResult> => {
      return notImplemented('getSpendingSummary');
    },
  }),
  getCashflowSummary: tool({
    title: 'get cashflow summary',
    description:
      'Get income, expenses, net, and savings rate for a period. Use this for questions about how much the user is saving and whether they saved more or less than another period.',
    inputSchema: z.object({
      scope: z
        .enum(AGENT_EXPENSE_SCOPES)
        .describe('Scope to summarize: personal or household.'),
      startDate: z.string().describe('Start date for the period.'),
      endDate: z.string().describe('End date for the period.'),
    }),
    execute: async (
      _input: GetCashflowSummaryInput,
    ): Promise<GetCashflowSummaryResult> => {
      return notImplemented('getCashflowSummary');
    },
  }),
  compareSpendingPeriods: tool({
    title: 'compare spending',
    description:
      'Compare spending between two periods and return the main reasons for the change. Use this for questions like why this month is higher than last month or what changed the most.',
    inputSchema: z.object({
      scope: z
        .enum(AGENT_EXPENSE_SCOPES)
        .describe('Scope to compare: personal or household.'),
      currentStartDate: z
        .string()
        .describe('Start date for the current period.'),
      currentEndDate: z.string().describe('End date for the current period.'),
      previousStartDate: z
        .string()
        .describe('Start date for the comparison period.'),
      previousEndDate: z
        .string()
        .describe('End date for the comparison period.'),
      breakdownBy: z
        .enum(SPENDING_COMPARISON_BREAKDOWN_BY)
        .describe('How to break down the change.')
        .optional(),
      limit: z
        .number()
        .int()
        .positive()
        .describe('Maximum number of change drivers to return.')
        .optional(),
    }),
    execute: async (
      _input: CompareSpendingPeriodsInput,
    ): Promise<CompareSpendingPeriodsResult> => {
      return notImplemented('compareSpendingPeriods');
    },
  }),
  findRecurringExpenseCandidates: tool({
    title: 'find recurring expenses',
    description:
      'Find expenses that look recurring, like subscriptions or repeated bills. Use this when the user asks about recurring charges they may want to review.',
    inputSchema: z.object({
      scope: z
        .enum(AGENT_EXPENSE_SCOPES)
        .describe('Scope to inspect: personal or household.'),
      startDate: z
        .string()
        .describe('Optional start date for the search window.')
        .optional(),
      endDate: z
        .string()
        .describe('Optional end date for the search window.')
        .optional(),
      minOccurrences: z
        .number()
        .int()
        .min(2)
        .describe('Minimum number of times an expense should repeat.')
        .optional(),
      maxCandidates: z
        .number()
        .int()
        .positive()
        .describe('Maximum number of recurring expenses to return.')
        .optional(),
    }),
    execute: async (
      _input: FindRecurringExpenseCandidatesInput,
    ): Promise<FindRecurringExpenseCandidatesResult> => {
      return notImplemented('findRecurringExpenseCandidates');
    },
  }),
};
