import {
  buildCumulativeSavingsPoints,
  buildDailyPoints,
  buildMonthlyCashflowPoints,
  buildMonthlyCategoryTotals,
  normalizeCategory,
} from './builders';

describe('expenses-stats builders', () => {
  it('normalizes empty categories', () => {
    expect(normalizeCategory(null)).toBe('uncategorized');
    expect(normalizeCategory('   ')).toBe('uncategorized');
    expect(normalizeCategory('food')).toBe('food');
  });

  it('builds monthly category totals for requested months', () => {
    const result = buildMonthlyCategoryTotals(
      ['2024-01', '2024-02'],
      [
        { month: '2024-01', category: 'rent', total_cents: 100 },
        { month: '2024-01', category: 'rent', total_cents: 200 },
      ],
    );

    expect(result).toEqual([
      {
        month: '2024-01',
        categories: [{ category: 'rent', totalCents: 300 }],
      },
      {
        month: '2024-02',
        categories: [],
      },
    ]);
  });

  it('prefers cumulative daily values when present', () => {
    const result = buildDailyPoints([
      { day: 2, total_cents: 20, cumulative_cents: 20 },
      { day: 1, total_cents: 10, cumulative_cents: null },
    ]);

    expect(result).toEqual([
      { day: 1, totalCents: 10 },
      { day: 2, totalCents: 20 },
    ]);
  });

  it('builds zero-filled monthly cashflow points', () => {
    const result = buildMonthlyCashflowPoints(
      ['2024-01', '2024-02'],
      [
        {
          month: '2024-01',
          income_cents: 100,
          expense_cents: 40,
          net_cents: 60,
        },
      ],
    );

    expect(result).toEqual([
      {
        month: '2024-01',
        incomeCents: 100,
        expenseCents: 40,
        netCents: 60,
      },
      {
        month: '2024-02',
        incomeCents: 0,
        expenseCents: 0,
        netCents: 0,
      },
    ]);
  });

  it('builds cumulative savings series from net points', () => {
    const result = buildCumulativeSavingsPoints([
      { month: '2024-01', incomeCents: 0, expenseCents: 0, netCents: 60 },
      { month: '2024-02', incomeCents: 0, expenseCents: 0, netCents: -10 },
    ]);

    expect(result).toEqual([
      { month: '2024-01', netCents: 60, cumulativeCents: 60 },
      { month: '2024-02', netCents: -10, cumulativeCents: 50 },
    ]);
  });
});
