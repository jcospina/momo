import { fireEvent, render } from '@testing-library/react';

import { MonthlyIncomeVsExpenseBarChart } from './monthly-income-vs-expense-bar-chart';

beforeEach(() => {
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    },
  });

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((callback: ResizeObserverCallback) => {
      let observer: ResizeObserver;
      const instance = {
        observe: (target: Element) => {
          const rect = {
            width: 800,
            height: 400,
            top: 0,
            left: 0,
            right: 800,
            bottom: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          };
          callback(
            [
              {
                contentRect: rect as DOMRectReadOnly,
                borderBoxSize: [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
                target,
              } as unknown as ResizeObserverEntry,
            ],
            observer,
          );
        },
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as ResizeObserver;
      observer = instance;
      return instance;
    }),
  });
});

describe('MonthlyIncomeVsExpenseBarChart (Visx)', () => {
  const months = [
    {
      month: '2026-01',
      incomeCents: 400_000,
      expenseCents: 250_000,
      netCents: 150_000,
    },
    {
      month: '2026-02',
      incomeCents: 450_000,
      expenseCents: 300_000,
      netCents: 150_000,
    },
  ];

  it('renders the two series legend entries (Income, Expenses)', () => {
    const { getByTestId } = render(
      <MonthlyIncomeVsExpenseBarChart months={months} currency="USD" />,
    );

    const legend = getByTestId('monthly-income-vs-expense-legend');
    const buttons = legend.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    const labels = Array.from(buttons).map(
      btn => btn.textContent?.trim() ?? '',
    );
    expect(labels).toEqual(['Income', 'Expenses']);
  });

  it('renders one rect per (month, series) with neobrutalist outline directly on each bar', () => {
    const { getAllByTestId } = render(
      <MonthlyIncomeVsExpenseBarChart months={months} currency="USD" />,
    );

    const bars = getAllByTestId('grouped-bar');
    // 2 months * 2 series = 4 bars (all values > 0).
    expect(bars).toHaveLength(months.length * 2);

    bars.forEach(rect => {
      expect(rect.getAttribute('stroke')).toBe('var(--chart-stroke)');
      expect(rect.getAttribute('stroke-width')).toBe('2');
      expect(rect.getAttribute('shape-rendering')).toBe('crispEdges');
    });

    // Per-month: exactly two rects, one Income and one Expenses.
    months.forEach(point => {
      const monthBars = bars.filter(
        b => b.getAttribute('data-month') === point.month,
      );
      expect(monthBars).toHaveLength(2);
      const series = monthBars.map(b => b.getAttribute('data-series')).sort();
      expect(series).toEqual(['Expenses', 'Income']);
    });
  });

  it('skips bars whose value is <= 0', () => {
    const { getAllByTestId } = render(
      <MonthlyIncomeVsExpenseBarChart
        months={[
          {
            month: '2026-01',
            incomeCents: 100_000,
            expenseCents: 0,
            netCents: 100_000,
          },
          {
            month: '2026-02',
            incomeCents: 0,
            expenseCents: 50_000,
            netCents: -50_000,
          },
        ]}
        currency="USD"
      />,
    );

    const bars = getAllByTestId('grouped-bar');
    // Only Income for Jan + Expenses for Feb.
    expect(bars).toHaveLength(2);
    const map = bars.map(b => ({
      month: b.getAttribute('data-month'),
      series: b.getAttribute('data-series'),
    }));
    expect(map).toEqual(
      expect.arrayContaining([
        { month: '2026-01', series: 'Income' },
        { month: '2026-02', series: 'Expenses' },
      ]),
    );
  });

  it('legend toggle removes all bars for the toggled series', () => {
    const { getAllByTestId, getByText } = render(
      <MonthlyIncomeVsExpenseBarChart months={months} currency="USD" />,
    );

    const initialIncome = getAllByTestId('grouped-bar').filter(
      b => b.getAttribute('data-series') === 'Income',
    );
    expect(initialIncome.length).toBeGreaterThan(0);

    const incomeButton = getByText('Income').closest('button');
    expect(incomeButton).not.toBeNull();
    fireEvent.click(incomeButton!);

    const afterToggle = getAllByTestId('grouped-bar').filter(
      b => b.getAttribute('data-series') === 'Income',
    );
    expect(afterToggle).toHaveLength(0);
  });

  it('renders tooltip on first touch with Net field computed from income - expense', () => {
    const { container, getByText } = render(
      <MonthlyIncomeVsExpenseBarChart months={months} currency="USD" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // The pointer layer is the last <rect> rendered inside the chart group.
    const rects = svg!.querySelectorAll('rect');
    const pointerLayer = rects[rects.length - 1];
    expect(pointerLayer).toBeDefined();

    fireEvent.touchStart(pointerLayer!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    // Net for either month is 150_000 cents = $1,500.00 in USD.
    expect(getByText(/Net:\s*\$1,500\.00/)).toBeInTheDocument();
  });
});
