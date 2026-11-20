import { act, fireEvent, render, screen } from '@testing-library/react';

import { RingChart } from './ring-chart';

/**
 * Swaps in an animation-frame queue the test advances by hand, each call to
 * `runFrame` handing every waiting callback the given timestamp.
 */
function manualAnimationFrames() {
  const original = {
    request: window.requestAnimationFrame,
    cancel: window.cancelAnimationFrame,
  };
  const pending = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  window.requestAnimationFrame = callback => {
    const id = nextId++;
    pending.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = id => {
    pending.delete(id);
  };
  return {
    runFrame(timestamp: number) {
      const callbacks = [...pending.values()];
      pending.clear();
      act(() => {
        for (const callback of callbacks) callback(timestamp);
      });
    },
    restore() {
      window.requestAnimationFrame = original.request;
      window.cancelAnimationFrame = original.cancel;
    },
  };
}

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

  it('finishes growing in when an arc is hovered mid-animation', () => {
    // The settled ring, with frames run synchronously (see beforeEach).
    const settled = render(<RingChart items={sampleItems} currency="USD" />);
    const settledPath = settled.container
      .querySelector('svg path')
      ?.getAttribute('d');
    settled.unmount();

    const frames = manualAnimationFrames();
    try {
      const { container } = render(
        <RingChart items={sampleItems} currency="USD" />,
      );
      frames.runFrame(1); // ParentSize measures; the grow-in is scheduled
      frames.runFrame(16); // the grow-in starts
      frames.runFrame(216); // partway through the 450ms grow-in

      const arc = container.querySelector('svg path');
      expect(arc).not.toBeNull();
      expect(arc?.getAttribute('d')).not.toBe(settledPath);
      // Hovering re-renders the chart; that alone must not restart the
      // grow-in, or a resting pointer keeps it looping forever.
      fireEvent.pointerEnter(arc!, { clientX: 400, clientY: 200 });

      frames.runFrame(232);
      frames.runFrame(470); // past the end of the original grow-in
      expect(container.querySelector('svg path')?.getAttribute('d')).toBe(
        settledPath,
      );
    } finally {
      frames.restore();
    }
  });

  it('renders tooltip lines as text, never as HTML', () => {
    const payload = '<img src=x onerror="window.__ringChartXss=true">';
    const { container } = render(
      <RingChart
        items={sampleItems}
        currency="USD"
        getTooltipLines={() => [
          { label: payload, value: '$1.00', emphasizeLabel: true },
          { label: '<svg/onload=alert(1)>', value: '$2.00' },
        ]}
      />,
    );
    const firstPath = container.querySelector('svg path');
    expect(firstPath).not.toBeNull();

    fireEvent.touchStart(firstPath!, {
      changedTouches: [{ clientX: 400, clientY: 200 }],
    });

    const emphasized = screen.getByText(payload);
    expect(emphasized.tagName).toBe('STRONG');
    expect(
      screen.getByText(/<svg\/onload=alert\(1\)>: \$2\.00/),
    ).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('svg[onload]')).toBeNull();
  });
});
