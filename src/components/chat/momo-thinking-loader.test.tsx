import { act, render, screen } from '@testing-library/react';
import { MomoThinkingLoader } from './momo-thinking-loader';

const ROTATION_MS = 2200;

function mockMatchMedia(prefersReduced: boolean) {
  const implementation = (query: string) =>
    ({
      matches: query === '(prefers-reduced-motion: reduce)' && prefersReduced,
      media: query,
      addEventListener: () => {
        /* noop */
      },
      removeEventListener: () => {
        /* noop */
      },
      addListener: () => {
        /* noop */
      },
      removeListener: () => {
        /* noop */
      },
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: implementation,
  });
}

describe('MomoThinkingLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rotates through the copy strings on a timer', () => {
    mockMatchMedia(false);
    render(<MomoThinkingLoader />);

    const initial = screen.getByRole('status', {
      name: 'MoMo is thinking',
    }).textContent;
    expect(initial).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(ROTATION_MS);
    });
    const afterOne = screen.getByRole('status', {
      name: 'MoMo is thinking',
    }).textContent;
    expect(afterOne).not.toEqual(initial);

    act(() => {
      jest.advanceTimersByTime(ROTATION_MS);
    });
    const afterTwo = screen.getByRole('status', {
      name: 'MoMo is thinking',
    }).textContent;
    expect(afterTwo).not.toEqual(afterOne);
  });

  it('does not rotate when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    render(<MomoThinkingLoader />);

    const initial = screen.getByRole('status', {
      name: 'MoMo is thinking',
    }).textContent;

    act(() => {
      jest.advanceTimersByTime(ROTATION_MS * 3);
    });

    expect(
      screen.getByRole('status', { name: 'MoMo is thinking' }).textContent,
    ).toEqual(initial);
  });
});
