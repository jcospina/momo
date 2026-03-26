import { fireEvent, render, screen } from '@testing-library/react';
import { ExpenseScopePanels } from './expense-scope-panels';

jest.mock('@components/stats/cashflow-panels', () => ({
  CashflowPanels: () => <div data-testid="cashflow-panels" />,
}));

jest.mock('@components/stats/ring-charts-panel', () => ({
  RingChartsPanel: ({
    showHouseholdTotals,
  }: {
    showHouseholdTotals?: boolean;
  }) => (
    <div data-testid="ring-charts-panel">
      {showHouseholdTotals ? 'household' : 'personal'}
    </div>
  ),
  CategoryRingPanel: () => <div data-testid="category-ring-panel" />,
}));

jest.mock('@components/stats/monthly-totals-panel', () => ({
  MonthlyTotalsPanel: () => <div data-testid="monthly-totals-panel" />,
}));

jest.mock('@components/charts/daily-comparison-line-chart', () => ({
  DailyComparisonLineChart: () => <div data-testid="daily-comparison-chart" />,
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
    <div data-testid="scope-toggle">
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

function buildScopeData() {
  return {
    months: ['2026-01', '2026-02', '2026-03'],
    rows: [],
    daily: {
      currentMonth: '2026-03',
      previousMonth: '2026-02',
      current: [],
      previous: [],
    },
    cashflow: {
      monthlyIncomeVsExpense: [],
      cumulativeSavings: [],
    },
  };
}

describe('ExpenseScopePanels', () => {
  it('renders personal expense visuals without scope toggle when household scope is unavailable', () => {
    render(
      <ExpenseScopePanels
        personal={buildScopeData()}
        household={buildScopeData()}
        currency="USD"
        householdAvailable={false}
      />,
    );

    expect(screen.queryByTestId('scope-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('cashflow-panels')).toBeInTheDocument();
    expect(screen.getByTestId('category-ring-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('ring-charts-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('monthly-totals-panel')).toBeInTheDocument();
    expect(screen.getByTestId('daily-comparison-chart')).toBeInTheDocument();
  });

  it('defaults to household and preserves scope-toggle switching between household and personal visuals', () => {
    render(
      <ExpenseScopePanels
        personal={buildScopeData()}
        household={buildScopeData()}
        currency="USD"
        householdAvailable
      />,
    );

    expect(screen.getByTestId('scope-toggle')).toBeInTheDocument();
    const personalToggle = screen.getByRole('button', { name: 'Personal' });
    const householdToggle = screen.getByRole('button', { name: 'Household' });
    expect(personalToggle).toBeInTheDocument();
    expect(householdToggle).toBeInTheDocument();
    expect(personalToggle).toHaveAttribute('data-selected', 'false');
    expect(householdToggle).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('cashflow-panels')).toBeInTheDocument();
    expect(screen.getByTestId('ring-charts-panel')).toHaveTextContent(
      'household',
    );
    expect(screen.getByTestId('monthly-totals-panel')).toBeInTheDocument();
    expect(screen.getByTestId('daily-comparison-chart')).toBeInTheDocument();

    fireEvent.click(personalToggle);
    expect(personalToggle).toHaveAttribute('data-selected', 'true');
    expect(householdToggle).toHaveAttribute('data-selected', 'false');
    expect(screen.queryByTestId('ring-charts-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('category-ring-panel')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-totals-panel')).toBeInTheDocument();
    expect(screen.getByTestId('daily-comparison-chart')).toBeInTheDocument();

    fireEvent.click(householdToggle);
    expect(personalToggle).toHaveAttribute('data-selected', 'false');
    expect(householdToggle).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('ring-charts-panel')).toHaveTextContent(
      'household',
    );
    expect(screen.queryByTestId('category-ring-panel')).not.toBeInTheDocument();
  });
});
