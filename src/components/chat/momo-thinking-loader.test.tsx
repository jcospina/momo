import enMessages from '@messages/en.json';
import { act, render, screen } from '@testing-library/react';
import { MomoThinkingLoader } from './momo-thinking-loader';

const ROTATION_MS = 2200;
const THINKING_COPY = enMessages.chat.momo.thinking as string[];
const THINKING_ARIA_LABEL = enMessages.chat.momo.thinkingAriaLabel;

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

function getCurrentCopy() {
  const status = screen.getByRole('status', { name: THINKING_ARIA_LABEL });
  const text = status.textContent ?? '';
  return THINKING_COPY.find(candidate => text.includes(candidate));
}

describe('MomoThinkingLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders copy from the localized rotation list', () => {
    mockMatchMedia(false);
    render(<MomoThinkingLoader />);

    const initial = getCurrentCopy();
    expect(initial).toBeTruthy();
    expect(THINKING_COPY).toContain(initial);
  });

  it('rotates through the copy strings on a timer', () => {
    mockMatchMedia(false);
    render(<MomoThinkingLoader />);

    const initial = getCurrentCopy();

    act(() => {
      jest.advanceTimersByTime(ROTATION_MS);
    });
    const afterOne = getCurrentCopy();
    expect(afterOne).not.toEqual(initial);
    expect(THINKING_COPY).toContain(afterOne);

    act(() => {
      jest.advanceTimersByTime(ROTATION_MS);
    });
    const afterTwo = getCurrentCopy();
    expect(afterTwo).not.toEqual(afterOne);
    expect(THINKING_COPY).toContain(afterTwo);
  });

  it('does not rotate when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    render(<MomoThinkingLoader />);

    const initial = getCurrentCopy();

    act(() => {
      jest.advanceTimersByTime(ROTATION_MS * 3);
    });

    expect(getCurrentCopy()).toEqual(initial);
  });
});
