import { fireEvent, render } from '@testing-library/react';

import { MonthlyTotalsBarChart } from './monthly-totals-bar-chart';

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

describe('MonthlyTotalsBarChart (Visx)', () => {
  const months = [
    {
      month: '2026-01',
      categories: [
        { category: 'Food', totalCents: 50_000 },
        { category: 'Rent', totalCents: 180_000 },
        { category: 'Transport', totalCents: 30_000 },
        { category: 'Health', totalCents: 20_000 },
        { category: 'Fun', totalCents: 15_000 },
        { category: 'Misc', totalCents: 8_000 },
      ],
    },
    {
      month: '2026-02',
      categories: [
        { category: 'Food', totalCents: 55_000 },
        { category: 'Rent', totalCents: 190_000 },
        { category: 'Transport', totalCents: 32_000 },
        { category: 'Health', totalCents: 21_000 },
        { category: 'Fun', totalCents: 16_000 },
        { category: 'Misc', totalCents: 9_000 },
      ],
    },
  ];

  it('renders six legend items: top 5 categories + Others', () => {
    const { getByTestId } = render(
      <MonthlyTotalsBarChart months={months} currency="USD" />,
    );

    const legend = getByTestId('monthly-totals-legend');
    const buttons = legend.querySelectorAll('button');
    expect(buttons).toHaveLength(6);

    const labels = Array.from(buttons).map(
      btn => btn.textContent?.trim() ?? '',
    );
    // Top 5 by total should appear: Rent, Food, Transport, Health, Fun.
    ['Rent', 'Food', 'Transport', 'Health', 'Fun', 'Others'].forEach(name => {
      expect(labels.some(l => l.includes(name))).toBe(true);
    });
  });

  it('draws exactly one outline rect per month (with total > 0) and renders no individual segment borders', () => {
    const { getAllByTestId } = render(
      <MonthlyTotalsBarChart months={months} currency="USD" />,
    );

    const outlines = getAllByTestId('stack-outline');
    expect(outlines).toHaveLength(months.length);
    outlines.forEach(rect => {
      expect(rect.getAttribute('fill')).toBe('none');
      expect(rect.getAttribute('stroke')).toBe('var(--chart-stroke)');
      expect(rect.getAttribute('stroke-width')).toBe('2');
      expect(rect.getAttribute('shape-rendering')).toBe('crispEdges');
      expect(rect.getAttribute('pointer-events')).toBe('none');
    });

    // Bar segments do not draw their own border.
    const segments = getAllByTestId('bar-segment');
    expect(segments.length).toBeGreaterThan(0);
    segments.forEach(seg => {
      // No stroke set on individual segments — only the outer outline strokes.
      expect(seg.getAttribute('stroke')).toBeNull();
    });
  });

  it('skips outlines for months whose visible total is zero', () => {
    const { getAllByTestId } = render(
      <MonthlyTotalsBarChart
        months={[
          {
            month: '2026-01',
            categories: [{ category: 'Food', totalCents: 100_000 }],
          },
          {
            month: '2026-02',
            categories: [{ category: 'Food', totalCents: 0 }],
          },
        ]}
        currency="USD"
      />,
    );

    const outlines = getAllByTestId('stack-outline');
    // Only Jan has a positive total.
    expect(outlines).toHaveLength(1);
    expect(outlines[0]?.getAttribute('data-month')).toBe('2026-01');
  });

  it('legend toggle hides all segments for the toggled series', () => {
    const { getAllByTestId, getByText } = render(
      <MonthlyTotalsBarChart months={months} currency="USD" />,
    );

    const initialRentSegments = getAllByTestId('bar-segment').filter(
      seg => seg.getAttribute('data-series') === 'Rent',
    );
    expect(initialRentSegments.length).toBeGreaterThan(0);

    const rentButton = getByText('Rent').closest('button');
    expect(rentButton).not.toBeNull();
    fireEvent.click(rentButton!);

    const afterToggle = getAllByTestId('bar-segment').filter(
      seg => seg.getAttribute('data-series') === 'Rent',
    );
    expect(afterToggle).toHaveLength(0);
  });

  it('fires onMonthClick with the month key and the full visible total', () => {
    const onMonthClick = jest.fn();
    const { getAllByTestId } = render(
      <MonthlyTotalsBarChart
        months={months}
        currency="USD"
        onMonthClick={onMonthClick}
      />,
    );

    const janSegments = getAllByTestId('bar-segment').filter(
      seg => seg.getAttribute('data-month') === '2026-01',
    );
    expect(janSegments.length).toBeGreaterThan(0);
    fireEvent.click(janSegments[0]);

    expect(onMonthClick).toHaveBeenCalledTimes(1);
    const expectedTotal = months[0].categories.reduce(
      (sum, c) => sum + c.totalCents,
      0,
    );
    expect(onMonthClick).toHaveBeenCalledWith({
      month: '2026-01',
      totalCents: expectedTotal,
    });
  });

  it('renders a tooltip on first touch of a bar segment', () => {
    const { getAllByTestId, getByText } = render(
      <MonthlyTotalsBarChart months={months} currency="USD" />,
    );

    const rentSegment = getAllByTestId('bar-segment').find(
      seg => seg.getAttribute('data-series') === 'Rent',
    );
    expect(rentSegment).toBeDefined();

    fireEvent.touchStart(rentSegment!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    expect(getByText(/Rent\s+\$1,800\.00/)).toBeInTheDocument();
  });
});
