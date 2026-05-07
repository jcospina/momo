import type { ChatMessage } from '@lib-types/chat';
import { act, render } from '@testing-library/react';
import {
  AT_BOTTOM_THRESHOLD_PX,
  PREFETCH_THRESHOLD_PX,
  type UseChatVirtualResult,
  useChatVirtual,
} from './use-chat-virtual';

type MutableEl = HTMLElement & {
  __mockScrollHeight?: number;
  __mockClientHeight?: number;
  __mockOffsetHeight?: number;
  __scrollTop?: number;
  __scrollTopWrites?: number;
};

const ITEM_HEIGHT = 48;

function buildMessage(
  id: string,
  createdAt: string,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id,
    household_id: null,
    user_id: 'u1',
    content: id,
    status: 'processed',
    expense_count: 0,
    created_at: createdAt,
    sender_name: null,
    ...overrides,
  };
}

let scrollToSpy: jest.SpyInstance;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get(): number {
      return (this as MutableEl).__mockScrollHeight ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(): number {
      return (this as MutableEl).__mockClientHeight ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(): number {
      return (this as MutableEl).__mockOffsetHeight ?? ITEM_HEIGHT;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    configurable: true,
    get(): number {
      return (this as MutableEl).__scrollTop ?? 0;
    },
    set(v: number) {
      const el = this as MutableEl;
      el.__scrollTopWrites = (el.__scrollTopWrites ?? 0) + 1;
      el.__scrollTop = v;
    },
  });
  // jsdom does not implement scrollTo; install a no-op so jest.spyOn can wrap it.
  if (!('scrollTo' in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: function noop() {
        // jsdom-only stub; replaced per-test by jest.spyOn.
      },
    });
  }
});

beforeEach(() => {
  scrollToSpy = jest.spyOn(HTMLElement.prototype, 'scrollTo');
  scrollToSpy.mockImplementation(function (
    this: MutableEl,
    opts: ScrollToOptions,
  ) {
    if (opts && typeof opts.top === 'number') {
      this.__scrollTop = opts.top;
    }
  } as never);
});

afterEach(() => {
  scrollToSpy.mockRestore();
});

type ScrollerProps = {
  scrollHeight?: number;
  clientHeight?: number;
  scrollTop?: number;
};

type HarnessProps = {
  messages: ChatMessage[];
  currentUserId?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  scrollerProps?: ScrollerProps;
  itemHeights?: Record<string, number>;
  resultRef?: { current: UseChatVirtualResult | null };
  scrollerOut?: { current: MutableEl | null };
};

function ChatItemSlot({
  id,
  height,
  recordHeight,
}: {
  id: string;
  height: number;
  recordHeight: (id: string, h: number) => void;
}) {
  return (
    <div
      ref={(node: MutableEl | null) => {
        if (!node) return;
        node.__mockOffsetHeight = height;
        recordHeight(id, height);
      }}
      data-testid={`item-${id}`}
    />
  );
}

function Harness({
  messages,
  currentUserId,
  hasMore,
  isLoadingMore,
  onLoadMore,
  scrollerProps,
  itemHeights,
  resultRef,
  scrollerOut,
}: HarnessProps) {
  const result = useChatVirtual({
    messages,
    currentUserId,
    hasMore,
    isLoadingMore,
    onLoadMore,
  });
  if (resultRef) resultRef.current = result;
  return (
    <div
      ref={(node: MutableEl | null) => {
        if (node) {
          if (scrollerProps?.scrollHeight !== undefined) {
            node.__mockScrollHeight = scrollerProps.scrollHeight;
          }
          if (scrollerProps?.clientHeight !== undefined) {
            node.__mockClientHeight = scrollerProps.clientHeight;
          }
          if (scrollerProps?.scrollTop !== undefined) {
            node.__scrollTop = scrollerProps.scrollTop;
          }
          if (scrollerOut) scrollerOut.current = node;
        }
        (result.scrollerRef as { current: MutableEl | null }).current = node;
      }}
      data-testid="scroller"
    >
      {messages.map(m => (
        <ChatItemSlot
          key={m.id}
          id={m.id}
          height={itemHeights?.[m.id] ?? ITEM_HEIGHT}
          recordHeight={result.recordHeight}
        />
      ))}
    </div>
  );
}

function getWrites(scroller: MutableEl): number {
  return scroller.__scrollTopWrites ?? 0;
}

function getScrollTop(scroller: MutableEl): number {
  return scroller.__scrollTop ?? 0;
}

function flushRaf(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

describe('useChatVirtual — first paint', () => {
  it('lands at bottom on initial mount when N>0 messages', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      buildMessage(`m${i + 1}`, `2024-01-01T00:00:0${i + 1}.000Z`),
    );
    const scrollerOut = { current: null as MutableEl | null };
    render(
      <Harness
        messages={messages}
        scrollerProps={{ scrollHeight: 5 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    const scroller = scrollerOut.current!;
    expect(scroller).not.toBeNull();
    expect(getScrollTop(scroller)).toBe(5 * ITEM_HEIGHT);
    expect(getWrites(scroller)).toBe(1);
  });

  it('does not crash on empty messages', () => {
    expect(() => render(<Harness messages={[]} />)).not.toThrow();
  });
});

describe('useChatVirtual — prepend anchor preservation', () => {
  it('writes scrollTop after prepend, anchored to the prior message', () => {
    const initial = Array.from({ length: 3 }, (_, i) =>
      buildMessage(`m${i + 1}`, `2024-01-01T00:00:0${i + 1}.000Z`),
    );
    const scrollerOut = { current: null as MutableEl | null };
    const { rerender } = render(
      <Harness
        messages={initial}
        scrollerProps={{ scrollHeight: 3 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    const scroller = scrollerOut.current!;
    // Simulate user scrolled up to 72.
    scroller.__scrollTop = 72;
    const writesBefore = getWrites(scroller);

    const prepended = [
      buildMessage('m-1', '2024-01-01T00:00:00.100Z'),
      buildMessage('m0', '2024-01-01T00:00:00.500Z'),
    ];
    rerender(
      <Harness
        messages={[...prepended, ...initial]}
        scrollerProps={{ scrollHeight: 5 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    expect(getWrites(scroller)).toBe(writesBefore + 1);
    expect(getScrollTop(scroller)).toBe(72 + 2 * ITEM_HEIGHT);
  });

  it('does not move scrollTop when no prepend and no append', () => {
    const messages = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
    ];
    const scrollerOut = { current: null as MutableEl | null };
    const { rerender } = render(
      <Harness
        messages={messages}
        scrollerProps={{ scrollHeight: 2 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    const scroller = scrollerOut.current!;
    const writesBefore = getWrites(scroller);
    scroller.__scrollTop = 30;
    rerender(
      <Harness
        messages={[...messages]}
        scrollerProps={{ scrollHeight: 2 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    expect(getWrites(scroller)).toBe(writesBefore);
  });
});

describe('useChatVirtual — append behavior', () => {
  it('smooth-scrolls to bottom when last message is from currentUserId', async () => {
    const initial = [buildMessage('m1', '2024-01-01T00:00:01.000Z')];
    const scrollerOut = { current: null as MutableEl | null };
    const { rerender } = render(
      <Harness
        messages={initial}
        currentUserId="u1"
        scrollerProps={{ scrollHeight: ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    scrollToSpy.mockClear();

    const next = [
      ...initial,
      buildMessage('m2', '2024-01-01T00:00:02.000Z', { user_id: 'u1' }),
    ];
    rerender(
      <Harness
        messages={next}
        currentUserId="u1"
        scrollerProps={{ scrollHeight: 2 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    await act(async () => {
      await flushRaf();
    });
    expect(scrollToSpy).toHaveBeenCalled();
    const lastCall = scrollToSpy.mock.calls.at(-1)![0] as ScrollToOptions;
    expect(lastCall.behavior).toBe('smooth');
  });

  it('smooth-scrolls on incoming when isAtBottom (initial state)', async () => {
    const initial = [buildMessage('m1', '2024-01-01T00:00:01.000Z')];
    const scrollerOut = { current: null as MutableEl | null };
    const { rerender } = render(
      <Harness
        messages={initial}
        currentUserId="me"
        scrollerProps={{ scrollHeight: ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    scrollToSpy.mockClear();

    const next = [
      ...initial,
      buildMessage('m2', '2024-01-01T00:00:02.000Z', { user_id: 'other' }),
    ];
    rerender(
      <Harness
        messages={next}
        currentUserId="me"
        scrollerProps={{ scrollHeight: 2 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
      />,
    );
    await act(async () => {
      await flushRaf();
    });
    expect(scrollToSpy).toHaveBeenCalled();
  });

  it('does NOT scroll on incoming when scrolled up (isAtBottom=false)', async () => {
    const initial = Array.from({ length: 5 }, (_, i) =>
      buildMessage(`m${i + 1}`, `2024-01-01T00:00:0${i + 1}.000Z`),
    );
    const scrollerOut = { current: null as MutableEl | null };
    const resultRef = { current: null as UseChatVirtualResult | null };
    const { rerender } = render(
      <Harness
        messages={initial}
        currentUserId="me"
        scrollerProps={{ scrollHeight: 5 * ITEM_HEIGHT, clientHeight: 100 }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    const scroller = scrollerOut.current!;
    // Distance from bottom = 240 - 0 - 100 = 140 > 48. onScroll flips to false.
    scroller.__scrollTop = 0;
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(resultRef.current!.isAtBottom).toBe(false);
    scrollToSpy.mockClear();
    const writesBefore = getWrites(scroller);

    const next = [
      ...initial,
      buildMessage('m6', '2024-01-01T00:00:06.000Z', { user_id: 'other' }),
    ];
    rerender(
      <Harness
        messages={next}
        currentUserId="me"
        scrollerProps={{ scrollHeight: 6 * ITEM_HEIGHT, clientHeight: 100 }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    await act(async () => {
      await flushRaf();
    });
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(getWrites(scroller)).toBe(writesBefore);
  });

  it('does NOT scroll when reconciling tmp-* to real id with same content', async () => {
    const initial = [
      buildMessage('tmp-abc', '2024-01-01T00:00:01.000Z', {
        user_id: 'u1',
        content: 'hello',
      }),
    ];
    const scrollerOut = { current: null as MutableEl | null };
    const { rerender } = render(
      <Harness
        messages={initial}
        currentUserId="u1"
        scrollerProps={{ scrollHeight: ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
        itemHeights={{ 'tmp-abc': 60 }}
      />,
    );
    const scroller = scrollerOut.current!;
    scrollToSpy.mockClear();
    const writesBefore = getWrites(scroller);

    const reconciled = [
      buildMessage('real-1', '2024-01-01T00:00:01.000Z', {
        user_id: 'u1',
        content: 'hello',
      }),
    ];
    rerender(
      <Harness
        messages={reconciled}
        currentUserId="u1"
        scrollerProps={{ scrollHeight: ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
        itemHeights={{ 'real-1': 60 }}
      />,
    );
    await act(async () => {
      await flushRaf();
    });
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(getWrites(scroller)).toBe(writesBefore);
  });
});

describe('useChatVirtual — load-more dedup', () => {
  it('fires onLoadMore once per unique oldest id', () => {
    const onLoadMore = jest.fn();
    const messages = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
    ];
    const scrollerOut = { current: null as MutableEl | null };
    const resultRef = { current: null as UseChatVirtualResult | null };
    render(
      <Harness
        messages={messages}
        hasMore={true}
        isLoadingMore={false}
        onLoadMore={onLoadMore}
        scrollerProps={{
          scrollHeight: 2 * ITEM_HEIGHT,
          clientHeight: 600,
          scrollTop: 0,
        }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    act(() => {
      resultRef.current!.onScroll();
      resultRef.current!.onScroll();
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('refires onLoadMore after oldest id changes (post-prepend)', () => {
    const onLoadMore = jest.fn();
    const initial = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
    ];
    const scrollerOut = { current: null as MutableEl | null };
    const resultRef = { current: null as UseChatVirtualResult | null };
    const { rerender } = render(
      <Harness
        messages={initial}
        hasMore={true}
        isLoadingMore={false}
        onLoadMore={onLoadMore}
        scrollerProps={{
          scrollHeight: 2 * ITEM_HEIGHT,
          clientHeight: 600,
          scrollTop: 0,
        }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    const older = [buildMessage('m0', '2024-01-01T00:00:00.000Z'), ...initial];
    rerender(
      <Harness
        messages={older}
        hasMore={true}
        isLoadingMore={false}
        onLoadMore={onLoadMore}
        scrollerProps={{
          scrollHeight: 3 * ITEM_HEIGHT,
          clientHeight: 600,
          scrollTop: 0,
        }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('does not fire onLoadMore while isLoadingMore=true', () => {
    const onLoadMore = jest.fn();
    const resultRef = { current: null as UseChatVirtualResult | null };
    render(
      <Harness
        messages={[buildMessage('m1', '2024-01-01T00:00:01.000Z')]}
        hasMore={true}
        isLoadingMore={true}
        onLoadMore={onLoadMore}
        scrollerProps={{
          scrollHeight: ITEM_HEIGHT,
          clientHeight: 600,
          scrollTop: 0,
        }}
        resultRef={resultRef}
      />,
    );
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not fire when scrollTop > PREFETCH_THRESHOLD_PX', () => {
    const onLoadMore = jest.fn();
    const resultRef = { current: null as UseChatVirtualResult | null };
    render(
      <Harness
        messages={[buildMessage('m1', '2024-01-01T00:00:01.000Z')]}
        hasMore={true}
        isLoadingMore={false}
        onLoadMore={onLoadMore}
        scrollerProps={{
          scrollHeight: 2000,
          clientHeight: 600,
          scrollTop: PREFETCH_THRESHOLD_PX + 1,
        }}
        resultRef={resultRef}
      />,
    );
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});

describe('useChatVirtual — the load-bearing invariant', () => {
  it('emits zero scrollTop writes across pure scroll events', () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      buildMessage(`m${i + 1}`, `2024-01-01T00:00:0${i + 1}.000Z`),
    );
    const scrollerOut = { current: null as MutableEl | null };
    const resultRef = { current: null as UseChatVirtualResult | null };
    render(
      <Harness
        messages={messages}
        scrollerProps={{ scrollHeight: 10 * ITEM_HEIGHT, clientHeight: 600 }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    const scroller = scrollerOut.current!;
    const writesAfterFirstPaint = getWrites(scroller);
    scrollToSpy.mockClear();

    for (let i = 0; i < 50; i += 1) {
      scroller.__scrollTop = i * 5;
      act(() => {
        resultRef.current!.onScroll();
      });
    }

    expect(getWrites(scroller)).toBe(writesAfterFirstPaint);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});

describe('useChatVirtual — isAtBottom transitions', () => {
  it('flips false past threshold and true on return', () => {
    const messages = [buildMessage('m1', '2024-01-01T00:00:01.000Z')];
    const scrollerOut = { current: null as MutableEl | null };
    const resultRef = { current: null as UseChatVirtualResult | null };
    render(
      <Harness
        messages={messages}
        scrollerProps={{ scrollHeight: 1000, clientHeight: 100 }}
        scrollerOut={scrollerOut}
        resultRef={resultRef}
      />,
    );
    const scroller = scrollerOut.current!;
    expect(resultRef.current!.isAtBottom).toBe(true);

    scroller.__scrollTop = 0; // distance = 1000 - 0 - 100 = 900 > 48
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(resultRef.current!.isAtBottom).toBe(false);

    scroller.__scrollTop = 900 - AT_BOTTOM_THRESHOLD_PX; // distance = 48
    act(() => {
      resultRef.current!.onScroll();
    });
    expect(resultRef.current!.isAtBottom).toBe(true);
  });
});
