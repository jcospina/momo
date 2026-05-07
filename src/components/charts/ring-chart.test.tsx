import { fireEvent, render, screen } from '@testing-library/react';

import { RingChart } from './ring-chart';

beforeEach(() => {
  // ParentSize uses ResizeObserver + requestAnimationFrame + lodash.debounce.
  // Make `requestAnimationFrame` synchronous in tests so the size update lands
  // before assertions run.
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
          // Fire one synchronous measurement with realistic desktop dimensions.
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

describe('RingChart (Visx)', () => {
  const sampleItems = [
    { name: 'Food', value: 100_000 },
    { name: 'Transport', value: 70_000 },
    { name: 'Housing', value: 30_000 },
  ];

  it('renders one stroked path per item using palette CSS variables', () => {
    const { container } = render(
      <RingChart items={sampleItems} currency="USD" />,
    );
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(sampleItems.length);
    paths.forEach((node, i) => {
      expect(node.getAttribute('fill')).toBe(`var(--chart-${i + 1})`);
      expect(node.getAttribute('stroke')).toBe('var(--chart-stroke)');
      expect(node.getAttribute('stroke-width')).toBe('2');
    });
  });

  it('shows the total in the centre overlay', () => {
    render(<RingChart items={sampleItems} currency="USD" />);
    // 100_000 + 70_000 + 30_000 = 200_000 cents = $2,000
    expect(screen.getByText('$2,000.00')).toBeInTheDocument();
  });

  it('renders a clickable legend entry per item', () => {
    render(<RingChart items={sampleItems} currency="USD" />);
    sampleItems.forEach(item => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });
    const legendButtons = screen.getAllByRole('button');
    expect(legendButtons.length).toBe(sampleItems.length);
  });

  it('toggling a legend item recomputes the total', () => {
    render(<RingChart items={sampleItems} currency="USD" />);
    const housingButton = screen
      .getByText('Housing')
      .closest('button') as HTMLButtonElement;
    fireEvent.click(housingButton);
    // 100_000 + 70_000 = 170_000 cents = $1,700.00
    expect(screen.getByText('$1,700.00')).toBeInTheDocument();
  });

  it('fires onItemClick when an arc is clicked', () => {
    const handler = jest.fn();
    const { container } = render(
      <RingChart items={sampleItems} currency="USD" onItemClick={handler} />,
    );
    const firstPath = container.querySelector('svg path');
    expect(firstPath).not.toBeNull();
    if (firstPath) fireEvent.click(firstPath);
    expect(handler).toHaveBeenCalledWith({ name: 'Food', value: 100_000 });
  });

  it('renders a tooltip on first touch of an arc', () => {
    const { container } = render(
      <RingChart items={sampleItems} currency="USD" />,
    );
    const firstPath = container.querySelector('svg path');
    expect(firstPath).not.toBeNull();

    fireEvent.touchStart(firstPath!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    expect(screen.getByText(/\(50\.0%\)/)).toBeInTheDocument();
  });
});
