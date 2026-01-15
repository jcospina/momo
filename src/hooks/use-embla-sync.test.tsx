import { renderHook } from '@testing-library/react';

import type { EmblaSyncApi } from './use-embla-sync';
import { useEmblaSync } from './use-embla-sync';

type EmblaCallback = Parameters<EmblaSyncApi['on']>[1];
type EmblaEvent = Parameters<EmblaSyncApi['on']>[0];
type EmblaHandler = ReturnType<EmblaSyncApi['on']>;

function createEmblaMock(initialIndex = 0) {
  let selected = initialIndex;
  const handlers: Record<string, () => void> = {};

  const api: EmblaSyncApi & { trigger: (event: EmblaEvent) => void } = {
    on: jest.fn((event: EmblaEvent, cb: EmblaCallback) => {
      handlers[event] = cb as () => void;
      return (() => undefined) as unknown as EmblaHandler;
    }),
    off: jest.fn((event: EmblaEvent, cb: EmblaCallback) => {
      delete handlers[event];
      void cb;
      return (() => undefined) as unknown as EmblaHandler;
    }),
    selectedScrollSnap: jest.fn(() => selected),
    scrollTo: jest.fn((index: number) => {
      selected = index;
    }),
    trigger(event: string) {
      handlers[event]?.();
    },
  };

  return api;
}

describe('useEmblaSync', () => {
  it('wires and unwires select handler', () => {
    const embla = createEmblaMock();
    const onSelect = jest.fn();
    const { unmount } = renderHook(() =>
      useEmblaSync(embla, { activeIndex: 0, onSelect }),
    );

    expect(embla.on).toHaveBeenCalledWith('select', expect.any(Function));
    embla.trigger('select');
    expect(onSelect).toHaveBeenCalledWith(0);

    unmount();
    expect(embla.off).toHaveBeenCalledWith('select', expect.any(Function));
  });

  it('scrolls when activeIndex changes', () => {
    const embla = createEmblaMock(0);
    const onSelect = jest.fn();

    const { rerender } = renderHook(
      ({ activeIndex }) => useEmblaSync(embla, { activeIndex, onSelect }),
      { initialProps: { activeIndex: 0 } },
    );

    rerender({ activeIndex: 2 });
    expect(embla.scrollTo).toHaveBeenCalledWith(2, true);
  });
});
