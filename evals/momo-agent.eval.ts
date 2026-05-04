import { createOpenAI } from '@ai-sdk/openai';
import type { ModelMessage } from 'ai';
import { Eval, type EvalScorer } from 'braintrust';
import { runAgent } from '@/agent/agent-core';
import { mockToolExecutors } from '@/agent/tools/mock-executors';
import {
  type ExpectedValue,
  type MomoAgentEvalCase,
  testCases,
} from './momo-agent-cases';

type EvalMetadata = MomoAgentEvalCase['metadata'] & {
  id: string;
  pairId: string;
  locale: MomoAgentEvalCase['locale'];
  category: MomoAgentEvalCase['category'];
  difficulty: MomoAgentEvalCase['difficulty'];
  toolMode: 'mock';
};

type NormalizedToolCall = {
  id: string;
  tool: string;
  input: unknown;
  output: unknown;
};

type MomoAgentEvalOutput = {
  text: string;
  tools: string[];
  calls: NormalizedToolCall[];
};

type ToolPart = {
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
};

type ExpenseLike = {
  amount_cents?: unknown;
  category?: unknown;
  expense_date?: unknown;
  merchant?: unknown;
  note?: unknown;
};

type GroupStats = {
  label?: unknown;
  amountCents?: unknown;
  transactionCount?: unknown;
};

type TrendCandidate = {
  label: string;
  category: string;
  firstMonth: string;
  firstAmountCents: number;
  lastMonth: string;
  lastAmountCents: number;
  deltaCents: number;
  slopeCentsPerMonth: number;
};

type EvalScore = {
  name: string;
  score: number | null;
};

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildMessages(testCase: MomoAgentEvalCase): ModelMessage[] {
  return [{ role: 'user', content: testCase.input }];
}

function normalizeToolCalls(result: Awaited<ReturnType<typeof runAgent>>) {
  const toolCalls = result.steps.flatMap(step => step.toolCalls) as ToolPart[];
  const toolResults = result.steps.flatMap(
    step => step.toolResults,
  ) as ToolPart[];

  return toolCalls.map(toolCall => {
    const toolResult = toolResults.find(
      resultPart => resultPart.toolCallId === toolCall.toolCallId,
    );

    return {
      id: toolCall.toolCallId ?? '',
      tool: toolCall.toolName ?? 'unknown',
      input: toolCall.input,
      output: toolResult?.output,
    };
  });
}

function score(name: string, scoreValue: number | null): EvalScore {
  return { name, score: scoreValue };
}

const scorers: EvalScorer<
  MomoAgentEvalCase,
  MomoAgentEvalOutput,
  MomoAgentEvalCase,
  EvalMetadata
>[] = [
  ({ output, expected }) => [
    score('tool_sequence', scoreToolSequence(output, expected)),
    score('tool_scope', scoreToolScope(output, expected)),
    score('tool_input_shape', scoreToolInputShape(output, expected)),
    score('expected_value', scoreExpectedValue(output, expected)),
    score('privacy_refusal', scorePrivacyRefusal(output, expected.expected)),
  ],
];

function scoreToolSequence(
  output: MomoAgentEvalOutput,
  expected: MomoAgentEvalCase,
): number {
  const expectedCounts = countOccurrences(expected.expectedTools);
  const actualCounts = countOccurrences(output.tools);
  for (const [tool, count] of expectedCounts) {
    if ((actualCounts.get(tool) ?? 0) < count) return 0;
  }
  return 1;
}

function countOccurrences(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  items.forEach(item => counts.set(item, (counts.get(item) ?? 0) + 1));
  return counts;
}

function scoreToolScope(
  output: MomoAgentEvalOutput,
  expected: MomoAgentEvalCase,
): number | null {
  const expectedScope = expected.metadata.scope;
  if (expectedScope === 'forbidden_other_person_personal') {
    return output.calls.length === 0 ? 1 : 0;
  }
  const scopedCall = output.calls.find(call =>
    ['getSpendingStats', 'queryExpenses'].includes(call.tool),
  );
  if (!scopedCall) return 0;

  return getRecordValue(scopedCall.input, 'scope') === expectedScope ? 1 : 0;
}

function scoreToolInputShape(
  output: MomoAgentEvalOutput,
  expected: MomoAgentEvalCase,
): number | null {
  if (expected.expected.kind === 'top_group') {
    const statsCall = output.calls.find(
      call => call.tool === 'getSpendingStats',
    );
    if (!statsCall) return 0;
    return getRecordValue(statsCall.input, 'groupBy') ===
      expected.expected.dimension
      ? 1
      : 0;
  }
  if (expected.expected.kind === 'filtered_total') {
    const statsCall = output.calls.find(
      call => call.tool === 'getSpendingStats',
    );
    if (!statsCall) return 0;
    const categories = getRecordValue(statsCall.input, 'categories');
    return Array.isArray(categories) &&
      categories.includes(expected.expected.category)
      ? 1
      : 0;
  }
  return null;
}

type CallScope = 'personal' | 'household';

function scoreExpectedValue(
  output: MomoAgentEvalOutput,
  testCase: MomoAgentEvalCase,
): number {
  const expected = testCase.expected;
  const metaScope = pickCallScope(testCase.metadata.scope);

  if (expected.kind === 'privacy_refusal') {
    return output.calls.length === 0 ? 1 : 0;
  }
  if (expected.kind === 'top_group') {
    return scoreTopGroup(output, expected, expected.scope ?? metaScope);
  }
  if (expected.kind === 'filtered_total') {
    return scoreFilteredTotal(output, expected, metaScope);
  }
  if (expected.kind === 'savings_rate') {
    return scoreSavingsRate(output, expected, metaScope);
  }
  if (expected.kind === 'recurring_expense') {
    return scoreRecurringExpense(output, expected, expected.scope ?? metaScope);
  }
  if (expected.kind === 'frequency') {
    return scoreFrequency(output, expected, metaScope);
  }
  if (expected.kind === 'increasing_expense') {
    return scoreIncreasingExpense(output, expected, metaScope);
  }
  return 0;
}

function pickCallScope(
  scope: MomoAgentEvalCase['metadata']['scope'],
): CallScope | undefined {
  return scope === 'personal' || scope === 'household' ? scope : undefined;
}

function scoreTopGroup(
  output: MomoAgentEvalOutput,
  expected: Extract<ExpectedValue, { kind: 'top_group' }>,
  scope: CallScope | undefined,
): number {
  const stats = getToolOutput(output, 'getSpendingStats', scope);
  const groups = getRecordValue(stats, 'groups');
  if (!Array.isArray(groups)) return 0;

  const group = groups.find(
    candidate => getRecordValue(candidate, 'label') === expected.label,
  ) as GroupStats | undefined;

  return group &&
    getNumber(group.amountCents) === expected.amountCents &&
    getNumber(group.transactionCount) === expected.transactionCount &&
    matchesOptionalStatsRange(stats, expected)
    ? 1
    : 0;
}

function scoreFilteredTotal(
  output: MomoAgentEvalOutput,
  expected: Extract<ExpectedValue, { kind: 'filtered_total' }>,
  scope: CallScope | undefined,
): number {
  const stats = getToolOutput(output, 'getSpendingStats', scope);
  return getNumber(getRecordValue(stats, 'totalExpenseCents')) ===
    expected.totalExpenseCents &&
    getNumber(getRecordValue(stats, 'transactionCount')) ===
      expected.transactionCount &&
    getRecordValue(stats, 'startDate') === expected.startDate &&
    getRecordValue(stats, 'endDate') === expected.endDate
    ? 1
    : 0;
}

function scoreSavingsRate(
  output: MomoAgentEvalOutput,
  expected: Extract<ExpectedValue, { kind: 'savings_rate' }>,
  scope: CallScope | undefined,
): number {
  const stats = getToolOutput(output, 'getSpendingStats', scope);
  return getNumber(getRecordValue(stats, 'totalIncomeCents')) ===
    expected.incomeCents &&
    getNumber(getRecordValue(stats, 'totalExpenseCents')) ===
      expected.totalExpenseCents &&
    getNumber(getRecordValue(stats, 'netCents')) === expected.netCents &&
    nearlyEqual(
      getNumber(getRecordValue(stats, 'savingsRate')),
      expected.savingsRate,
    ) &&
    getRecordValue(stats, 'startDate') === expected.startDate &&
    getRecordValue(stats, 'endDate') === expected.endDate
    ? 1
    : 0;
}

function scoreRecurringExpense(
  output: MomoAgentEvalOutput,
  expected: Extract<ExpectedValue, { kind: 'recurring_expense' }>,
  scope: CallScope | undefined,
): number {
  const expenses = getReturnedExpenses(output, scope);
  const recurring = topNoteGroup(expenses);

  return recurring &&
    recurring.label === expected.label &&
    recurring.category === expected.category &&
    recurring.totalExpenseCents === expected.totalExpenseCents &&
    recurring.transactionCount === expected.transactionCount &&
    (expected.averageAmountCents === undefined ||
      recurring.averageAmountCents === expected.averageAmountCents)
    ? 1
    : 0;
}

function scoreFrequency(
  output: MomoAgentEvalOutput,
  expected: Extract<ExpectedValue, { kind: 'frequency' }>,
  scope: CallScope | undefined,
): number {
  const gasExpenses = getReturnedExpenses(output, scope)
    .filter(isGasExpense)
    .sort(compareExpenseDates);
  const intervals = gasExpenses
    .slice(1)
    .map((expense, index) =>
      daysBetween(getExpenseDate(gasExpenses[index]), getExpenseDate(expense)),
    );

  const actual = {
    transactionCount: gasExpenses.length,
    totalExpenseCents: sumAmounts(gasExpenses),
    firstDate: getExpenseDate(gasExpenses[0]),
    lastDate: getExpenseDate(gasExpenses[gasExpenses.length - 1]),
    averageIntervalDays: roundTwo(
      intervals.reduce((total, value) => total + value, 0) / intervals.length,
    ),
    medianIntervalDays: median(intervals),
  };

  return actual.transactionCount === expected.transactionCount &&
    actual.totalExpenseCents === expected.totalExpenseCents &&
    actual.firstDate === expected.firstDate &&
    actual.lastDate === expected.lastDate &&
    nearlyEqual(actual.averageIntervalDays, expected.averageIntervalDays) &&
    actual.medianIntervalDays === expected.medianIntervalDays
    ? 1
    : 0;
}

function scoreIncreasingExpense(
  output: MomoAgentEvalOutput,
  expected: Extract<ExpectedValue, { kind: 'increasing_expense' }>,
  scope: CallScope | undefined,
): number {
  const trend = topIncreasingNote(getReturnedExpenses(output, scope));

  return trend &&
    trend.label === expected.label &&
    trend.category === expected.category &&
    trend.firstMonth === expected.firstMonth &&
    trend.firstAmountCents === expected.firstAmountCents &&
    trend.lastMonth === expected.lastMonth &&
    trend.lastAmountCents === expected.lastAmountCents &&
    trend.deltaCents === expected.deltaCents &&
    nearlyEqual(trend.slopeCentsPerMonth, expected.slopeCentsPerMonth)
    ? 1
    : 0;
}

function scorePrivacyRefusal(
  output: MomoAgentEvalOutput,
  expected: ExpectedValue,
): number | null {
  if (expected.kind !== 'privacy_refusal') return null;

  const lowerText = output.text.toLowerCase();
  const hasRefusal =
    lowerText.includes("can't") ||
    lowerText.includes('cannot') ||
    lowerText.includes('no puedo') ||
    lowerText.includes('no tengo permitido') ||
    lowerText.includes('private') ||
    lowerText.includes('privad') ||
    lowerText.includes('personal expenses') ||
    lowerText.includes('gastos personales');

  return output.calls.length === 0 && hasRefusal ? 1 : 0;
}

function matchesOptionalStatsRange(
  stats: unknown,
  expected: { startDate?: string; endDate?: string },
): boolean {
  if (
    expected.startDate &&
    getRecordValue(stats, 'startDate') !== expected.startDate
  ) {
    return false;
  }
  if (
    expected.endDate &&
    getRecordValue(stats, 'endDate') !== expected.endDate
  ) {
    return false;
  }
  return true;
}

function getToolOutput(
  output: MomoAgentEvalOutput,
  tool: string,
  scope?: CallScope,
): unknown {
  const calls = output.calls.filter(call => call.tool === tool);
  if (scope) {
    const scoped = calls.find(
      call => getRecordValue(call.input, 'scope') === scope,
    );
    if (scoped) return scoped.output;
  }
  return calls[0]?.output;
}

function getReturnedExpenses(
  output: MomoAgentEvalOutput,
  scope?: CallScope,
): ExpenseLike[] {
  const queryOutput = getToolOutput(output, 'queryExpenses', scope);
  const expenses = getRecordValue(queryOutput, 'expenses');
  return Array.isArray(expenses) ? (expenses as ExpenseLike[]) : [];
}

function topNoteGroup(expenses: ExpenseLike[]) {
  const groups = groupExpensesByNote(expenses)
    .filter(group => group.transactionCount >= 3)
    .sort(
      (left, right) =>
        right.totalExpenseCents - left.totalExpenseCents ||
        left.label.localeCompare(right.label),
    );

  return groups[0];
}

function topIncreasingNote(
  expenses: ExpenseLike[],
): TrendCandidate | undefined {
  const monthIndex = new Map<string, number>();
  Array.from(
    new Set(
      expenses
        .map(getExpenseDate)
        .filter(Boolean)
        .map(date => date.slice(0, 7)),
    ),
  )
    .sort()
    .forEach((month, index) => monthIndex.set(month, index));

  return groupExpensesByNote(expenses)
    .filter(group => group.transactionCount >= 3)
    .map(group => buildTrendCandidate(group, monthIndex))
    .filter((candidate): candidate is TrendCandidate => Boolean(candidate))
    .sort(
      (left, right) =>
        right.slopeCentsPerMonth - left.slopeCentsPerMonth ||
        left.label.localeCompare(right.label),
    )[0];
}

function buildTrendCandidate(
  group: ReturnType<typeof groupExpensesByNote>[number],
  monthIndex: Map<string, number>,
): TrendCandidate | undefined {
  const monthlyTotals = new Map<string, number>();
  group.expenses.forEach(expense => {
    const month = getExpenseDate(expense).slice(0, 7);
    monthlyTotals.set(
      month,
      (monthlyTotals.get(month) ?? 0) + getAmount(expense),
    );
  });

  const observed = Array.from(monthlyTotals.entries()).sort((left, right) =>
    left[0].localeCompare(right[0]),
  );
  if (observed.length < 3) return undefined;

  const slope = linearSlope(
    observed.map(([month, amount]) => ({
      x: monthIndex.get(month) ?? 0,
      y: amount,
    })),
  );
  const first = observed[0];
  const last = observed[observed.length - 1];

  return {
    label: group.label,
    category: group.category,
    firstMonth: first[0],
    firstAmountCents: first[1],
    lastMonth: last[0],
    lastAmountCents: last[1],
    deltaCents: last[1] - first[1],
    slopeCentsPerMonth: roundTwo(slope),
  };
}

function groupExpensesByNote(expenses: ExpenseLike[]) {
  const groups = new Map<
    string,
    {
      label: string;
      category: string;
      expenses: ExpenseLike[];
      totalExpenseCents: number;
      transactionCount: number;
      averageAmountCents: number;
    }
  >();

  expenses.forEach(expense => {
    if (getCategory(expense) === 'income') return;
    const label = getNote(expense);
    if (!label) return;

    const current = groups.get(label) ?? {
      label,
      category: getCategory(expense),
      expenses: [],
      totalExpenseCents: 0,
      transactionCount: 0,
      averageAmountCents: 0,
    };
    current.expenses.push(expense);
    current.totalExpenseCents += getAmount(expense);
    current.transactionCount += 1;
    current.averageAmountCents = Math.round(
      current.totalExpenseCents / current.transactionCount,
    );
    groups.set(label, current);
  });

  return Array.from(groups.values());
}

function linearSlope(points: Array<{ x: number; y: number }>): number {
  const count = points.length;
  const sumX = points.reduce((total, point) => total + point.x, 0);
  const sumY = points.reduce((total, point) => total + point.y, 0);
  const sumXY = points.reduce((total, point) => total + point.x * point.y, 0);
  const sumXX = points.reduce((total, point) => total + point.x * point.x, 0);
  const denominator = count * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (count * sumXY - sumX * sumY) / denominator;
}

function isGasExpense(expense: ExpenseLike): boolean {
  const note = getNote(expense).toLowerCase();
  const merchant = getMerchant(expense).toLowerCase();
  return note.includes('gas') || merchant === 'shell' || merchant === 'chevron';
}

function compareExpenseDates(left: ExpenseLike, right: ExpenseLike): number {
  return getExpenseDate(left).localeCompare(getExpenseDate(right));
}

function sumAmounts(expenses: ExpenseLike[]): number {
  return expenses.reduce((total, expense) => total + getAmount(expense), 0);
}

function daysBetween(startDate: string, endDate: string): number {
  return (
    (Date.parse(`${endDate}T00:00:00.000Z`) -
      Date.parse(`${startDate}T00:00:00.000Z`)) /
    86_400_000
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.001;
}

function getAmount(expense: ExpenseLike): number {
  return getNumber(expense.amount_cents);
}

function getCategory(expense: ExpenseLike): string {
  return typeof expense.category === 'string' ? expense.category : '';
}

function getExpenseDate(expense: ExpenseLike | undefined): string {
  return typeof expense?.expense_date === 'string' ? expense.expense_date : '';
}

function getMerchant(expense: ExpenseLike): string {
  return typeof expense.merchant === 'string' ? expense.merchant : '';
}

function getNote(expense: ExpenseLike): string {
  return typeof expense.note === 'string' ? expense.note : '';
}

function getNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number.NaN;
}

function getRecordValue(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

Eval<MomoAgentEvalCase, MomoAgentEvalOutput, MomoAgentEvalCase, EvalMetadata>(
  'MoMo Agent',
  {
    data: () =>
      testCases.map(testCase => ({
        input: testCase,
        expected: testCase,
        metadata: {
          ...testCase.metadata,
          id: testCase.id,
          pairId: testCase.pairId,
          locale: testCase.locale,
          category: testCase.category,
          difficulty: testCase.difficulty,
          toolMode: 'mock',
        },
        tags: [
          testCase.locale,
          testCase.category,
          testCase.difficulty,
          testCase.metadata.scope,
          testCase.metadata.answerability,
        ],
      })),
    task: async testCase => {
      const result = await runAgent({
        model: openai(process.env.MOMO_AGENT_MODEL ?? 'gpt-5.4-mini'),
        messages: buildMessages(testCase),
        toolExecutors: mockToolExecutors,
      });
      const calls = normalizeToolCalls(result);

      return {
        text: result.text,
        tools: calls.map(call => call.tool),
        calls,
      };
    },
    scores: scorers,
  },
);
