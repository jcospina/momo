import { fireEvent, render } from '@testing-library/react';
import type { CumulativeSavingsPoint } from '@/lib/data/stats/types';

import { CumulativeSavingsLineChart } from './cumulative-savings-line-chart';

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

describe('CumulativeSavingsLineChart (Visx)', () => {
  const positiveMonths: CumulativeSavingsPoint[] = [
    { month: '2026-01', netCents: 50_000, cumulativeCents: 50_000 },
    { month: '2026-02', netCents: 100_000, cumulativeCents: 150_000 },
    { month: '2026-03', netCents: 80_000, cumulativeCents: 230_000 },
  ];

  const negativeMonths: CumulativeSavingsPoint[] = [
    { month: '2026-01', netCents: -150_000, cumulativeCents: -150_000 },
    { month: '2026-02', netCents: -100_000, cumulativeCents: -250_000 },
  ];

  it('renders a line and an area path tied to the palette CSS variable', () => {
    const { container } = render(
      <CumulativeSavingsLineChart months={positiveMonths} currency="USD" />,
    );

    const paths = Array.from(container.querySelectorAll('svg path'));
    // The exact two shapes we care about: the area (non-zero fill-opacity)
    // and the line (no fill, has stroke).
    const area = paths.find(p => p.getAttribute('fill-opacity') === '0.14');
    const line = paths.find(p => p.getAttribute('stroke-width') === '3');

    expect(area).toBeDefined();
    expect(line).toBeDefined();
    expect((line?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
    expect((area?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
    expect(line?.getAttribute('stroke')).toBe('var(--chart-1)');
    expect(area?.getAttribute('fill')).toBe('var(--chart-1)');
  });

  it('renders compact-formatted Y axis tick labels for the cumulative scale', () => {
    const { container } = render(
      <CumulativeSavingsLineChart months={positiveMonths} currency="USD" />,
    );

    // AxisLeft renders <text> elements per tick. Ensure at least one of them
    // contains a $ sign — confirms `formatCompactCurrency` was applied to the
    // numeric tick value rather than the raw cents.
    const tickTexts = Array.from(container.querySelectorAll('svg text'))
      .map(node => node.textContent ?? '')
      .filter(Boolean);
    expect(tickTexts.some(text => text.includes('$'))).toBe(true);
  });

  it('does not show a circle marker by default (multi-month series)', () => {
    const { container } = render(
      <CumulativeSavingsLineChart months={positiveMonths} currency="USD" />,
    );
    const symbols = container.querySelectorAll('circle');
    expect(symbols.length).toBe(0);
  });

  it('renders empty-circle markers when only one month is provided', () => {
    const singleMonth: CumulativeSavingsPoint[] = [
      { month: '2026-01', netCents: -75_000, cumulativeCents: -75_000 },
    ];
    const { container } = render(
      <CumulativeSavingsLineChart months={singleMonth} currency="USD" />,
    );
    const symbols = container.querySelectorAll('circle');
    // chartMonths duplicates the single point -> two empty-circle markers.
    expect(symbols.length).toBeGreaterThanOrEqual(2);
    const first = symbols[0];
    expect(first?.getAttribute('stroke')).toBe('var(--chart-stroke)');
    expect(first?.getAttribute('fill')).toBe('none');
  });

  it('renders the line and area for negative-only cumulative ranges', () => {
    const { container } = render(
      <CumulativeSavingsLineChart months={negativeMonths} currency="USD" />,
    );
    const paths = Array.from(container.querySelectorAll('svg path'));
    const area = paths.find(p => p.getAttribute('fill-opacity') === '0.14');
    const line = paths.find(p => p.getAttribute('stroke-width') === '3');
    expect(area).toBeDefined();
    expect(line).toBeDefined();
    expect((area?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
    expect((line?.getAttribute('d') ?? '').length).toBeGreaterThan(0);
  });

  it('renders a tooltip on first touch of the hit area', () => {
    const { container, getByText } = render(
      <CumulativeSavingsLineChart months={positiveMonths} currency="USD" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const rects = svg!.querySelectorAll('rect');
    const pointerLayer = rects[rects.length - 1];
    expect(pointerLayer).toBeDefined();

    fireEvent.touchStart(pointerLayer!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    expect(getByText(/Cumulative savings:/)).toBeInTheDocument();
  });

  it('renders a dashed vertical crosshair while the tooltip is active', () => {
    const { container, getByTestId } = render(
      <CumulativeSavingsLineChart months={positiveMonths} currency="USD" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const rects = svg!.querySelectorAll('rect');
    const pointerLayer = rects[rects.length - 1];
    expect(pointerLayer).toBeDefined();

    fireEvent.touchStart(pointerLayer!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    const crosshair = getByTestId('hover-crosshair');
    expect(crosshair.getAttribute('stroke')).toBe('var(--chart-stroke)');
    expect(crosshair.getAttribute('stroke-width')).toBe('2');
    expect(crosshair.getAttribute('stroke-dasharray')).toBe('4 4');
    expect(crosshair.getAttribute('pointer-events')).toBe('none');
  });
});
