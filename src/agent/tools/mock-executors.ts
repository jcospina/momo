import copDatasetJson from '@evals/mocks/dataset/expenses.cop.golden.json';
import eurDatasetJson from '@evals/mocks/dataset/expenses.eur.golden.json';
import usdDatasetJson from '@evals/mocks/dataset/expenses.usd.golden.json';
import type { ExpenseRecord } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import type { AgentContext } from '@/agent/context';
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

type GoldenDataset = {
  metadata: {
    currency: SupportedCurrency;
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

const datasetsByCurrency: Record<SupportedCurrency, GoldenDataset> = {
  COP: copDatasetJson as GoldenDataset,
  EUR: eurDatasetJson as GoldenDataset,
  USD: usdDatasetJson as GoldenDataset,
};

const expensesByCurrency: Record<SupportedCurrency, ExpenseRecord[]> = {
  COP: datasetsByCurrency.COP.rows.map(toExpenseRecord).sort(compareExpenses),
  EUR: datasetsByCurrency.EUR.rows.map(toExpenseRecord).sort(compareExpenses),
  USD: datasetsByCurrency.USD.rows.map(toExpenseRecord).sort(compareExpenses),
};

export function getMockDatasetMetadata(currency: SupportedCurrency) {
  return datasetsByCurrency[currency].metadata;
}

function selectDataset(context: AgentContext): GoldenDataset {
  return datasetsByCurrency[context.currency];
}

function selectExpenses(context: AgentContext): ExpenseRecord[] {
  return expensesByCurrency[context.currency];
}

export async function resolveDateRange(
  input: ResolveDateRangeInput,
  context: AgentContext,
): Promise<ResolveDateRangeResult> {
  const dataset = selectDataset(context);
  const currentDate = dataset.metadata.endDate;
  return resolveDateRangeFromCurrentDate(input, {
    datasetStartDate: dataset.metadata.startDate,
    currentDate,
    defaultTimezone: DEFAULT_TIMEZONE,
  });
}

export async function queryExpenses(
  input: QueryExpensesInput,
  context: AgentContext,
): Promise<QueryExpensesResult> {
  return buildQueryExpensesResult({
    context: getMockAnalyticsContext(context),
    input,
    rows: selectExpenses(context),
  });
}

export async function getSpendingStats(
  input: GetSpendingStatsInput,
  context: AgentContext,
): Promise<GetSpendingStatsResult> {
  return buildSpendingStatsResult({
    context: getMockAnalyticsContext(context),
    input,
    rows: selectExpenses(context),
  });
}

export const mockToolExecutors: AgentToolExecutors = {
  getSpendingStats,
  queryExpenses,
  resolveDateRange,
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

function getMockAnalyticsContext(
  context: AgentContext,
): ExpenseAnalyticsContext {
  const metadata = datasetsByCurrency[context.currency].metadata;
  return {
    currency: context.currency,
    currentUserId: metadata.ownerId,
    householdId: metadata.householdId,
    otherUserId: metadata.memberId,
  };
}
