import { fireEvent, render, screen } from '@testing-library/react';
import type {
  CumulativeSavingsPoint,
  MonthlyCashflowPoint,
} from '@/lib/data/stats/types';
import { CashflowPanels } from './cashflow-panels';

jest.mock('@components/charts/monthly-income-vs-expense-bar-chart', () => ({
  MonthlyIncomeVsExpenseBarChart: ({
    months,
  }: {
    months: MonthlyCashflowPoint[];
  }) => (
    <div data-testid="income-vs-expense-chart">
      {months.map(point => point.month).join(',')}
    </div>
  ),
}));

jest.mock('@components/charts/cumulative-savings-line-chart', () => ({
  CumulativeSavingsLineChart: ({
    months,
  }: {
    months: CumulativeSavingsPoint[];
  }) => (
    <div data-testid="cumulative-savings-chart">
      {months.map(point => point.month).join(',')}
    </div>
  ),
}));

jest.mock('@ui/toggle-group/toggle-group', () => ({
  ToggleGroup: ({
    items,
    value,
    onValueChange,
  }: {
    items: Array<{ label: string; value: string }>;
    value?: string[];
    onValueChange?: (value: string[]) => void;
  }) => (
    <div>
      {items.map(item => (
        <button
          key={item.value}
          type="button"
          aria-label={item.label}
          data-selected={value?.includes(item.value) ? 'true' : 'false'}
          onClick={() => onValueChange?.([item.value])}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/hooks/use-media-query', () => ({
  mq: (query: string) => query,
  useMediaQuery: () => false,
}));

function buildMonthlyIncomeVsExpense(): MonthlyCashflowPoint[] {
  return [
    {
      month: '2026-01',
      incomeCents: 400_000,
      expenseCents: 150_000,
      netCents: 250_000,
    },
    {
      month: '2026-02',
      incomeCents: 420_000,
      expenseCents: 170_000,
      netCents: 250_000,
    },
    {
      month: '2026-03',
      incomeCents: 430_000,
      expenseCents: 210_000,
      netCents: 220_000,
    },
    {
      month: '2026-04',
      incomeCents: 450_000,
      expenseCents: 215_000,
      netCents: 235_000,
    },
    {
      month: '2026-05',
      incomeCents: 465_000,
      expenseCents: 225_000,
      netCents: 240_000,
    },
    {
      month: '2026-06',
      incomeCents: 470_000,
      expenseCents: 230_000,
      netCents: 240_000,
    },
  ];
}

function buildCumulativeSavings(): CumulativeSavingsPoint[] {
  return [
    { month: '2026-01', netCents: 250_000, cumulativeCents: 250_000 },
    { month: '2026-02', netCents: 250_000, cumulativeCents: 500_000 },
    { month: '2026-03', netCents: 220_000, cumulativeCents: 720_000 },
    { month: '2026-04', netCents: 235_000, cumulativeCents: 955_000 },
    { month: '2026-05', netCents: 240_000, cumulativeCents: 1_195_000 },
    { month: '2026-06', netCents: 240_000, cumulativeCents: 1_435_000 },
  ];
}

describe('CashflowPanels', () => {
  it('renders additive cashflow visuals with trailing 3-month default windows', () => {
    render(
      <CashflowPanels
        monthlyIncomeVsExpense={buildMonthlyIncomeVsExpense()}
        cumulativeSavings={buildCumulativeSavings()}
        currency="USD"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Income vs expenses' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Cumulative savings' }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('income-vs-expense-chart')).toHaveTextContent(
      '2026-04,2026-05,2026-06',
    );
    expect(screen.getByTestId('cumulative-savings-chart')).toHaveTextContent(
      '2026-04,2026-05,2026-06',
    );
  });

  it('applies 1m range windowing on both panels', () => {
    render(
      <CashflowPanels
        monthlyIncomeVsExpense={buildMonthlyIncomeVsExpense()}
        cumulativeSavings={buildCumulativeSavings()}
        currency="USD"
      />,
    );

    const oneMonthToggles = screen.getAllByRole('button', { name: '1m' });
    fireEvent.click(oneMonthToggles[0]);
    fireEvent.click(oneMonthToggles[1]);

    expect(screen.getByTestId('income-vs-expense-chart')).toHaveTextContent(
      '2026-06',
    );
    expect(screen.getByTestId('cumulative-savings-chart')).toHaveTextContent(
      '2026-06',
    );
  });

  it('navigates previous/next windows independently per chart panel', () => {
    render(
      <CashflowPanels
        monthlyIncomeVsExpense={buildMonthlyIncomeVsExpense()}
        cumulativeSavings={buildCumulativeSavings()}
        currency="USD"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Previous months income vs expenses',
      }),
    );

    expect(screen.getByTestId('income-vs-expense-chart')).toHaveTextContent(
      '2026-01,2026-02,2026-03',
    );
    expect(screen.getByTestId('cumulative-savings-chart')).toHaveTextContent(
      '2026-04,2026-05,2026-06',
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Previous months cumulative savings',
      }),
    );

    expect(screen.getByTestId('cumulative-savings-chart')).toHaveTextContent(
      '2026-01,2026-02,2026-03',
    );
  });

  it('shows empty overlays when active windows have no cashflow values', () => {
    const emptyIncome = [
      { month: '2026-05', incomeCents: 0, expenseCents: 0, netCents: 0 },
      { month: '2026-06', incomeCents: 0, expenseCents: 0, netCents: 0 },
    ];

    const emptySavings = [
      { month: '2026-05', netCents: 0, cumulativeCents: 0 },
      { month: '2026-06', netCents: 0, cumulativeCents: 0 },
    ];

    render(
      <CashflowPanels
        monthlyIncomeVsExpense={emptyIncome}
        cumulativeSavings={emptySavings}
        currency="USD"
      />,
    );

    expect(screen.getAllByText('No data yet')).toHaveLength(2);
  });

  it('does not show empty overlays when cumulative savings values are negative', () => {
    const negativeSavings = [
      { month: '2026-05', netCents: -120_000, cumulativeCents: -120_000 },
      { month: '2026-06', netCents: -80_000, cumulativeCents: -200_000 },
    ];

    render(
      <CashflowPanels
        monthlyIncomeVsExpense={buildMonthlyIncomeVsExpense()}
        cumulativeSavings={negativeSavings}
        currency="USD"
      />,
    );

    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
    expect(screen.getByTestId('cumulative-savings-chart')).toHaveTextContent(
      '2026-05,2026-06',
    );
  });
});
