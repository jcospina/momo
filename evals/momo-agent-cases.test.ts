import type { SupportedCurrency } from '@lib-types/user-preferences';
import copDatasetJson from './mocks/dataset/expenses.cop.golden.json';
import eurDatasetJson from './mocks/dataset/expenses.eur.golden.json';
import usdDatasetJson from './mocks/dataset/expenses.usd.golden.json';
import {
  type ExpectedValue,
  type MomoAgentEvalCase,
  testCases,
} from './momo-agent-cases';

type GoldenDataset = {
  metadata: {
    currency: SupportedCurrency;
    endDate: string;
    householdId: string;
    memberId: string;
    ownerId: string;
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

type Group = {
  label: string;
  amountCents: number;
  transactionCount: number;
};

const datasetsByCurrency: Record<SupportedCurrency, GoldenDataset> = {
  COP: copDatasetJson as GoldenDataset,
  EUR: eurDatasetJson as GoldenDataset,
  USD: usdDatasetJson as GoldenDataset,
};

describe('momo agent eval cases', () => {
  it('keeps English and Spanish cases paired', () => {
    const byPair = Map.groupBy(testCases, testCase => testCase.pairId);

    byPair.forEach(pairCases => {
      expect(pairCases).toHaveLength(2);
      expect(pairCases.map(testCase => testCase.locale).sort()).toEqual([
        'en',
        'es',
      ]);
      expect(pairCases[0].expected).toEqual(pairCases[1].expected);
      expect(pairCases[0].expectedTools).toEqual(pairCases[1].expectedTools);
      expect(pairCases[0].metadata.currency).toEqual(
        pairCases[1].metadata.currency,
      );
    });
  });

  it('matches expected values to the golden expense fixture', () => {
    testCases.forEach(testCase => {
      expectExpectedValue(testCase);
    });
  });

  it('exercises a realistic mix of currencies (COP majority, USD/EUR coverage)', () => {
    const distribution = new Map<SupportedCurrency, number>();
    testCases.forEach(testCase => {
      distribution.set(
        testCase.metadata.currency,
        (distribution.get(testCase.metadata.currency) ?? 0) + 1,
      );
    });

    const cop = distribution.get('COP') ?? 0;
    const usd = distribution.get('USD') ?? 0;
    const eur = distribution.get('EUR') ?? 0;

    expect(cop).toBeGreaterThan(usd);
    expect(cop).toBeGreaterThan(eur);
    expect(usd).toBeGreaterThan(0);
    expect(eur).toBeGreaterThan(0);
  });

  it('covers household totals from both fixture users in every currency', () => {
    const expectedHouseholdTotals: Record<
      SupportedCurrency,
      { current: Group; member: Group }
    > = {
      USD: {
        current: {
          label: 'Current user',
          amountCents: 7_093_877,
          transactionCount: 272,
        },
        member: {
          label: 'Household member',
          amountCents: 4_438_904,
          transactionCount: 306,
        },
      },
      EUR: {
        current: {
          label: 'Current user',
          amountCents: 7_093_877,
          transactionCount: 272,
        },
        member: {
          label: 'Household member',
          amountCents: 4_438_904,
          transactionCount: 306,
        },
      },
      COP: {
        current: {
          label: 'Current user',
          amountCents: 269_567_326,
          transactionCount: 272,
        },
        member: {
          label: 'Household member',
          amountCents: 168_678_352,
          transactionCount: 306,
        },
      },
    };

    (Object.keys(datasetsByCurrency) as SupportedCurrency[]).forEach(
      currency => {
        const dataset = datasetsByCurrency[currency];
        const groups = groupRows(householdExpenseRows(dataset), row =>
          userLabel(dataset, row.user_id),
        );

        expect(groups[0]).toEqual(expectedHouseholdTotals[currency].current);
        expect(groups[1]).toEqual(expectedHouseholdTotals[currency].member);
      },
    );
  });
});

function expectExpectedValue(testCase: MomoAgentEvalCase) {
  const expected = testCase.expected;
  const dataset = datasetsByCurrency[testCase.metadata.currency];

  if (expected.kind === 'privacy_refusal') {
    expect(testCase.expectedTools).toEqual([]);
    return;
  }
  if (expected.kind === 'top_group') {
    expectTopGroup(testCase, dataset, expected);
    return;
  }
  if (expected.kind === 'filtered_total') {
    expectFilteredTotal(testCase, dataset, expected);
    return;
  }
  if (expected.kind === 'savings_rate') {
    expectSavingsRate(testCase, dataset, expected);
    return;
  }
  if (expected.kind === 'recurring_expense') {
    expectRecurringExpense(testCase, dataset, expected);
    return;
  }
  if (expected.kind === 'frequency') {
    expectFrequency(testCase, dataset, expected);
    return;
  }
  if (expected.kind === 'increasing_expense') {
    expectIncreasingExpense(testCase, dataset, expected);
  }
}

function expectTopGroup(
  testCase: MomoAgentEvalCase,
  dataset: GoldenDataset,
  expected: Extract<ExpectedValue, { kind: 'top_group' }>,
) {
  const rows = scopedExpenseRows(dataset, testCase.metadata.scope).filter(row =>
    isInRange(row, expected.startDate, expected.endDate),
  );
  const groups = groupRows(rows, row => {
    if (expected.dimension === 'month') return row.expense_date.slice(0, 7);
    if (expected.dimension === 'user') return userLabel(dataset, row.user_id);
    return row.category ?? 'uncategorized';
  });

  expect(groups[0]).toEqual({
    label: expected.label,
    amountCents: expected.amountCents,
    transactionCount: expected.transactionCount,
  });
}

function expectFilteredTotal(
  testCase: MomoAgentEvalCase,
  dataset: GoldenDataset,
  expected: Extract<ExpectedValue, { kind: 'filtered_total' }>,
) {
  const requiredTags = expected.tags ?? [];
  const rows = scopedExpenseRows(dataset, testCase.metadata.scope).filter(
    row =>
      isInRange(row, expected.startDate, expected.endDate) &&
      row.category === expected.category &&
      requiredTags.every(tag => row.tags.includes(tag)),
  );

  expect(sumAmounts(rows)).toBe(expected.totalExpenseCents);
  expect(rows).toHaveLength(expected.transactionCount);
}

function expectSavingsRate(
  testCase: MomoAgentEvalCase,
  dataset: GoldenDataset,
  expected: Extract<ExpectedValue, { kind: 'savings_rate' }>,
) {
  const rows = scopedRows(dataset, testCase.metadata.scope).filter(row =>
    isInRange(row, expected.startDate, expected.endDate),
  );
  const incomeCents = sumAmounts(rows.filter(row => row.category === 'income'));
  const totalExpenseCents = sumAmounts(
    rows.filter(row => row.category !== 'income'),
  );
  const netCents = incomeCents - totalExpenseCents;
  const savingsRate = roundFour(netCents / incomeCents);

  expect({
    incomeCents,
    totalExpenseCents,
    netCents,
    savingsRate,
    savingsPercentage: roundTwo(savingsRate * 100),
  }).toEqual({
    incomeCents: expected.incomeCents,
    totalExpenseCents: expected.totalExpenseCents,
    netCents: expected.netCents,
    savingsRate: expected.savingsRate,
    savingsPercentage: expected.savingsPercentage,
  });
}

function expectRecurringExpense(
  testCase: MomoAgentEvalCase,
  dataset: GoldenDataset,
  expected: Extract<ExpectedValue, { kind: 'recurring_expense' }>,
) {
  const topRecurring = topNoteGroup(
    scopedExpenseRows(dataset, testCase.metadata.scope),
  );

  expect(topRecurring).toMatchObject({
    label: expected.label,
    category: expected.category,
    totalExpenseCents: expected.totalExpenseCents,
    transactionCount: expected.transactionCount,
  });
  if (expected.averageAmountCents) {
    expect(topRecurring?.averageAmountCents).toBe(expected.averageAmountCents);
  }
}

function expectFrequency(
  testCase: MomoAgentEvalCase,
  dataset: GoldenDataset,
  expected: Extract<ExpectedValue, { kind: 'frequency' }>,
) {
  const rows = scopedExpenseRows(dataset, testCase.metadata.scope).filter(
    isGasExpense,
  );

  expect({
    transactionCount: rows.length,
    totalExpenseCents: sumAmounts(rows),
  }).toEqual({
    transactionCount: expected.transactionCount,
    totalExpenseCents: expected.totalExpenseCents,
  });
}

function expectIncreasingExpense(
  testCase: MomoAgentEvalCase,
  dataset: GoldenDataset,
  expected: Extract<ExpectedValue, { kind: 'increasing_expense' }>,
) {
  expect(
    topIncreasingNote(scopedExpenseRows(dataset, testCase.metadata.scope)),
  ).toEqual({
    label: expected.label,
    category: expected.category,
    firstMonth: expected.firstMonth,
    firstAmountCents: expected.firstAmountCents,
    lastMonth: expected.lastMonth,
    lastAmountCents: expected.lastAmountCents,
    deltaCents: expected.deltaCents,
    slopeCentsPerMonth: expected.slopeCentsPerMonth,
  });
}

function scopedExpenseRows(
  dataset: GoldenDataset,
  scope: MomoAgentEvalCase['metadata']['scope'],
) {
  return scopedRows(dataset, scope).filter(row => row.category !== 'income');
}

function scopedRows(
  dataset: GoldenDataset,
  scope: MomoAgentEvalCase['metadata']['scope'],
) {
  if (scope === 'personal') {
    return dataset.rows.filter(row => row.user_id === dataset.metadata.ownerId);
  }
  if (scope === 'household') {
    return householdRows(dataset);
  }
  return [];
}

function householdExpenseRows(dataset: GoldenDataset) {
  return householdRows(dataset).filter(row => row.category !== 'income');
}

function householdRows(dataset: GoldenDataset) {
  return dataset.rows.filter(
    row => row.household_id === dataset.metadata.householdId,
  );
}

function groupRows(
  rows: GoldenExpenseRow[],
  labelFor: (row: GoldenExpenseRow) => string,
) {
  const groups = new Map<string, Group>();

  rows.forEach(row => {
    const label = labelFor(row);
    const current = groups.get(label) ?? {
      label,
      amountCents: 0,
      transactionCount: 0,
    };
    current.amountCents += row.amount_cents;
    current.transactionCount += 1;
    groups.set(label, current);
  });

  return Array.from(groups.values()).sort(
    (left, right) =>
      right.amountCents - left.amountCents ||
      left.label.localeCompare(right.label),
  );
}

function topNoteGroup(rows: GoldenExpenseRow[]) {
  return groupByNote(rows)
    .filter(group => group.transactionCount >= 3)
    .sort(
      (left, right) =>
        right.totalExpenseCents - left.totalExpenseCents ||
        left.label.localeCompare(right.label),
    )[0];
}

function topIncreasingNote(rows: GoldenExpenseRow[]) {
  const monthIndex = new Map<string, number>();
  Array.from(new Set(rows.map(row => row.expense_date.slice(0, 7))))
    .sort()
    .forEach((month, index) => monthIndex.set(month, index));

  return groupByNote(rows)
    .filter(group => group.transactionCount >= 3)
    .map(group => {
      const monthlyTotals = new Map<string, number>();
      group.rows.forEach(row => {
        const month = row.expense_date.slice(0, 7);
        monthlyTotals.set(
          month,
          (monthlyTotals.get(month) ?? 0) + row.amount_cents,
        );
      });
      const observed = Array.from(monthlyTotals.entries()).sort((left, right) =>
        left[0].localeCompare(right[0]),
      );
      if (observed.length < 3) return null;

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
        slopeCentsPerMonth: roundTwo(
          linearSlope(
            observed.map(([month, amount]) => ({
              x: monthIndex.get(month) ?? 0,
              y: amount,
            })),
          ),
        ),
      };
    })
    .filter((group): group is NonNullable<typeof group> => Boolean(group))
    .sort(
      (left, right) =>
        right.slopeCentsPerMonth - left.slopeCentsPerMonth ||
        left.label.localeCompare(right.label),
    )[0];
}

function groupByNote(rows: GoldenExpenseRow[]) {
  const groups = new Map<
    string,
    {
      label: string;
      category: string;
      rows: GoldenExpenseRow[];
      totalExpenseCents: number;
      transactionCount: number;
      averageAmountCents: number;
    }
  >();

  rows.forEach(row => {
    if (!row.note || row.category === 'income') return;

    const current = groups.get(row.note) ?? {
      label: row.note,
      category: row.category ?? 'uncategorized',
      rows: [],
      totalExpenseCents: 0,
      transactionCount: 0,
      averageAmountCents: 0,
    };
    current.rows.push(row);
    current.totalExpenseCents += row.amount_cents;
    current.transactionCount += 1;
    current.averageAmountCents = Math.round(
      current.totalExpenseCents / current.transactionCount,
    );
    groups.set(row.note, current);
  });

  return Array.from(groups.values());
}

function isInRange(
  row: GoldenExpenseRow,
  startDate?: string,
  endDate?: string,
) {
  if (startDate && row.expense_date < startDate) return false;
  if (endDate && row.expense_date > endDate) return false;
  return true;
}

function isGasExpense(row: GoldenExpenseRow) {
  return row.tags.includes('gas');
}

function userLabel(dataset: GoldenDataset, userId: string) {
  if (userId === dataset.metadata.ownerId) return 'Current user';
  if (userId === dataset.metadata.memberId) return 'Household member';
  return userId;
}

function sumAmounts(rows: GoldenExpenseRow[]) {
  return rows.reduce((total, row) => total + row.amount_cents, 0);
}

function linearSlope(points: Array<{ x: number; y: number }>) {
  const count = points.length;
  const sumX = points.reduce((total, point) => total + point.x, 0);
  const sumY = points.reduce((total, point) => total + point.y, 0);
  const sumXY = points.reduce((total, point) => total + point.x * point.y, 0);
  const sumXX = points.reduce((total, point) => total + point.x * point.x, 0);
  const denominator = count * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (count * sumXY - sumX * sumY) / denominator;
}

function roundFour(value: number) {
  return Math.round(value * 10000) / 10000;
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}
