import { fireEvent, render } from '@testing-library/react';

import { DailyComparisonLineChart } from './daily-comparison-line-chart';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-03-09T12:00:00Z'));

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

afterEach(() => {
  jest.useRealTimers();
});

describe('DailyComparisonLineChart (Visx)', () => {
  const currentPoints = [
    { day: 1, totalCents: 100 },
    { day: 9, totalCents: 900 },
    { day: 12, totalCents: 1_200 },
  ];
  const previousPoints = [
    { day: 1, totalCents: 50 },
    { day: 8, totalCents: 800 },
    { day: 12, totalCents: 1_100 },
  ];

  it('renders two line paths (current and previous) with palette colors', () => {
    const { container } = render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={currentPoints}
        previous={previousPoints}
        currency="USD"
      />,
    );

    const linePaths = Array.from(
      container.querySelectorAll('svg path[stroke-width="3"]'),
    );
    expect(linePaths).toHaveLength(2);

    const strokes = linePaths.map(p => p.getAttribute('stroke'));
    expect(strokes).toContain('var(--chart-1)');
    expect(strokes).toContain('var(--chart-2)');

    linePaths.forEach(path => {
      expect(path.getAttribute('fill')).toBe('none');
      expect((path.getAttribute('d') ?? '').length).toBeGreaterThan(0);
    });
  });

  it('renders persistent today markers for both series at the current day', () => {
    const { getByTestId } = render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={currentPoints}
        previous={previousPoints}
        currency="USD"
      />,
    );

    const markerCurrent = getByTestId('marker-current');
    const markerPrevious = getByTestId('marker-previous');

    [markerCurrent, markerPrevious].forEach(marker => {
      expect(marker.getAttribute('r')).toBe('5');
      expect(marker.getAttribute('fill')).toBe('var(--chart-tooltip-bg)');
      expect(marker.getAttribute('stroke')).toBe('var(--chart-stroke)');
      expect(marker.getAttribute('stroke-width')).toBe('2');
      expect(marker.getAttribute('pointer-events')).toBe('none');
    });

    // Both markers must share the same x coordinate (today, day 9 with the
    // forward-fill series — system time is 2026-03-09).
    expect(markerCurrent.getAttribute('cx')).toBe(
      markerPrevious.getAttribute('cx'),
    );
  });

  it('does not render today markers when today is outside [1, maxDay]', () => {
    // System time set to 2026-03-09; using a 5-day window forces today (9) > maxDay.
    const { queryByTestId } = render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={[{ day: 1, totalCents: 100 }]}
        previous={[{ day: 2, totalCents: 50 }]}
        currency="USD"
      />,
    );

    expect(queryByTestId('marker-current')).toBeNull();
    expect(queryByTestId('marker-previous')).toBeNull();
  });

  it('formats axis day ticks: only days in {1, 5, 10, ..., maxDay} have labels', () => {
    const { container } = render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={currentPoints}
        previous={previousPoints}
        currency="USD"
      />,
    );

    // maxDay = 12 here, so visible day labels should be {1, 5, 10, 12}.
    const tickTexts = Array.from(container.querySelectorAll('svg text'))
      .map(node => node.textContent ?? '')
      .filter(text => /^\d+$/.test(text))
      .map(text => Number(text));

    const expected = new Set([1, 5, 10, 12]);
    tickTexts.forEach(day => {
      expect(expected.has(day)).toBe(true);
    });
    expected.forEach(day => {
      expect(tickTexts).toContain(day);
    });
  });

  it('renders a clickable legend with both series labels', () => {
    const { getByTestId } = render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={currentPoints}
        previous={previousPoints}
        currency="USD"
      />,
    );

    const legend = getByTestId('daily-comparison-legend');
    const buttons = legend.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders a tooltip on first touch of the hit area', () => {
    const { container, getByText } = render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={currentPoints}
        previous={previousPoints}
        currency="USD"
      />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const rects = svg!.querySelectorAll('rect');
    const pointerLayer = rects[rects.length - 1];
    expect(pointerLayer).toBeDefined();

    fireEvent.touchStart(pointerLayer!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    expect(getByText(/Day \d+/)).toBeInTheDocument();
  });
});
