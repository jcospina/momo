import { ReadableStream } from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';

import { act, renderHook, waitFor } from '@testing-library/react';

// jsdom doesn't ship `TextEncoder`, `TextDecoder`, or `ReadableStream`
// natively. Pull them from Node so anything downstream that constructs
// them at module load works.
if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder =
    TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder =
    TextDecoder as unknown as typeof globalThis.TextDecoder;
}
if (typeof globalThis.ReadableStream === 'undefined') {
  (
    globalThis as unknown as { ReadableStream: typeof ReadableStream }
  ).ReadableStream =
    ReadableStream as unknown as typeof globalThis.ReadableStream;
}

jest.mock('@/lib/data/messages/client', () => ({
  streamMomo: jest.fn(),
}));

import { streamMomo } from '@/lib/data/messages/client';

import { useMomoStream } from './use-momo-stream';

const mockStreamMomo = streamMomo as jest.MockedFunction<typeof streamMomo>;

type ControlledStream = {
  iterable: AsyncIterable<string>;
  push: (chunk: string) => void;
  close: () => void;
  error: (err: Error) => void;
  /** Resolves once the consumer is awaiting the next chunk. */
  awaitConsumer: () => Promise<void>;
};

/**
 * Manually-driven async iterable. The consumer (the hook) calls `next()` and
 * blocks on the returned promise until a test pushes a chunk, closes the
 * stream, or errors it.
 */
function makeControlledStream(signal?: AbortSignal): ControlledStream {
  const queue: Array<
    | { kind: 'chunk'; value: string }
    | { kind: 'close' }
    | {
        kind: 'error';
        err: Error;
      }
  > = [];
  let pending: {
    resolve: (r: IteratorResult<string>) => void;
    reject: (e: unknown) => void;
  } | null = null;
  const consumerWaiters: Array<() => void> = [];

  function notifyConsumerWaiting() {
    const waiters = consumerWaiters.splice(0);
    for (const w of waiters) w();
  }

  function flush() {
    if (!pending || queue.length === 0) return;
    const next = queue.shift();
    if (!next) return;
    const p = pending;
    pending = null;
    if (next.kind === 'chunk') {
      p.resolve({ value: next.value, done: false });
    } else if (next.kind === 'close') {
      p.resolve({ value: undefined, done: true });
    } else {
      p.reject(next.err);
    }
  }

  const iterable: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<string>> {
          if (signal?.aborted) {
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise<IteratorResult<string>>((resolve, reject) => {
            pending = { resolve, reject };
            // Tell tests we've reached the await point.
            notifyConsumerWaiting();
            flush();
          });
        },
        return(): Promise<IteratorResult<string>> {
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };

  return {
    iterable,
    push: chunk => {
      queue.push({ kind: 'chunk', value: chunk });
      flush();
    },
    close: () => {
      queue.push({ kind: 'close' });
      flush();
    },
    error: err => {
      queue.push({ kind: 'error', err });
      flush();
    },
    awaitConsumer: () =>
      new Promise<void>(resolve => {
        if (pending) {
          resolve();
          return;
        }
        consumerWaiters.push(resolve);
      }),
  };
}

describe('useMomoStream', () => {
  beforeEach(() => {
    mockStreamMomo.mockReset();
  });

  it('streams chunks for a single trigger and transitions sending → streaming → done', async () => {
    const controlled = makeControlledStream();
    mockStreamMomo.mockReturnValueOnce(controlled.iterable);

    const { result } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 't-1',
      });
    });

    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('sending'),
    );
    expect(mockStreamMomo).toHaveBeenCalledTimes(1);
    expect(mockStreamMomo).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 't-1',
        signal: expect.any(AbortSignal),
      }),
    );

    await act(async () => {
      controlled.push('hello ');
      await controlled.awaitConsumer();
    });
    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('streaming'),
    );
    expect(result.current.streams.get('t-1')?.text).toBe('hello ');

    await act(async () => {
      controlled.push('momo');
      await controlled.awaitConsumer();
      controlled.close();
    });
    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('done'),
    );
    expect(result.current.streams.get('t-1')?.text).toBe('hello momo');
    expect(result.current.streams.get('t-1')?.error).toBeNull();
  });

  it('runs two streams in parallel without aborting the in-flight one', async () => {
    const aSignals: AbortSignal[] = [];
    const bSignals: AbortSignal[] = [];
    const streamA = makeControlledStream();
    const streamB = makeControlledStream();

    mockStreamMomo.mockImplementationOnce(({ signal }) => {
      if (signal) aSignals.push(signal);
      return streamA.iterable;
    });
    mockStreamMomo.mockImplementationOnce(({ signal }) => {
      if (signal) bSignals.push(signal);
      return streamB.iterable;
    });

    const { result } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo X',
        householdId: null,
        triggeringMessageId: 't-A',
      });
    });

    await waitFor(() =>
      expect(result.current.streams.get('t-A')?.status).toBe('sending'),
    );
    expect(aSignals).toHaveLength(1);
    expect(aSignals[0].aborted).toBe(false);

    // Start a second stream while the first is still in flight.
    act(() => {
      result.current.start({
        content: '@momo Y',
        householdId: null,
        triggeringMessageId: 't-B',
      });
    });

    await waitFor(() =>
      expect(result.current.streams.get('t-B')?.status).toBe('sending'),
    );

    // Critical guarantee: starting B must NOT abort A.
    expect(aSignals[0].aborted).toBe(false);
    expect(bSignals).toHaveLength(1);
    expect(bSignals[0].aborted).toBe(false);

    // Each stream accumulates independently.
    await act(async () => {
      streamA.push('A1 ');
      streamB.push('B1 ');
      await streamA.awaitConsumer();
      await streamB.awaitConsumer();
    });
    await waitFor(() =>
      expect(result.current.streams.get('t-A')?.text).toBe('A1 '),
    );
    expect(result.current.streams.get('t-B')?.text).toBe('B1 ');

    await act(async () => {
      streamA.push('A2');
      streamB.push('B2');
      await streamA.awaitConsumer();
      await streamB.awaitConsumer();
      streamA.close();
      streamB.close();
    });

    await waitFor(() => {
      expect(result.current.streams.get('t-A')?.status).toBe('done');
      expect(result.current.streams.get('t-B')?.status).toBe('done');
    });
    expect(result.current.streams.get('t-A')?.text).toBe('A1 A2');
    expect(result.current.streams.get('t-B')?.text).toBe('B1 B2');
  });

  it('is a no-op when start() is called twice with the same triggeringMessageId', async () => {
    const controlled = makeControlledStream();
    mockStreamMomo.mockReturnValueOnce(controlled.iterable);

    const { result } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 't-1',
      });
    });
    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('sending'),
    );
    expect(mockStreamMomo).toHaveBeenCalledTimes(1);

    // Second start() with same id should be a no-op.
    act(() => {
      result.current.start({
        content: '@momo hi again',
        householdId: null,
        triggeringMessageId: 't-1',
      });
    });

    expect(mockStreamMomo).toHaveBeenCalledTimes(1);
    // State stays as it was — no reset to a fresh entry.
    expect(result.current.streams.get('t-1')?.status).toBe('sending');

    // Cleanup: let the original stream finish so React doesn't complain.
    await act(async () => {
      controlled.close();
    });
    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('done'),
    );
  });

  it('abort() targets a single stream and leaves the others running', async () => {
    const aSignals: AbortSignal[] = [];
    const bSignals: AbortSignal[] = [];
    const streamA = makeControlledStream();
    const streamB = makeControlledStream();

    mockStreamMomo.mockImplementationOnce(({ signal }) => {
      if (signal) aSignals.push(signal);
      return streamA.iterable;
    });
    mockStreamMomo.mockImplementationOnce(({ signal }) => {
      if (signal) bSignals.push(signal);
      return streamB.iterable;
    });

    const { result } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo X',
        householdId: null,
        triggeringMessageId: 't-A',
      });
      result.current.start({
        content: '@momo Y',
        householdId: null,
        triggeringMessageId: 't-B',
      });
    });

    await waitFor(() => {
      expect(result.current.streams.get('t-A')?.status).toBe('sending');
      expect(result.current.streams.get('t-B')?.status).toBe('sending');
    });

    act(() => {
      result.current.abort('t-A');
    });

    expect(aSignals[0].aborted).toBe(true);
    expect(bSignals[0].aborted).toBe(false);
    // Aborted stream is dropped from the map.
    expect(result.current.streams.get('t-A')).toBeUndefined();
    expect(result.current.streams.get('t-B')?.status).toBe('sending');

    // B can still complete normally.
    await act(async () => {
      streamB.push('done-B');
      await streamB.awaitConsumer();
      streamB.close();
    });
    await waitFor(() =>
      expect(result.current.streams.get('t-B')?.status).toBe('done'),
    );
    expect(result.current.streams.get('t-B')?.text).toBe('done-B');
  });

  it('abort() for an unknown trigger id is a no-op', () => {
    const { result } = renderHook(() => useMomoStream());
    expect(() => {
      act(() => {
        result.current.abort('nope');
      });
    }).not.toThrow();
    expect(mockStreamMomo).not.toHaveBeenCalled();
  });

  it('aborts every in-flight stream on unmount', async () => {
    const aSignals: AbortSignal[] = [];
    const bSignals: AbortSignal[] = [];
    const streamA = makeControlledStream();
    const streamB = makeControlledStream();

    mockStreamMomo.mockImplementationOnce(({ signal }) => {
      if (signal) aSignals.push(signal);
      return streamA.iterable;
    });
    mockStreamMomo.mockImplementationOnce(({ signal }) => {
      if (signal) bSignals.push(signal);
      return streamB.iterable;
    });

    const { result, unmount } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo X',
        householdId: null,
        triggeringMessageId: 't-A',
      });
      result.current.start({
        content: '@momo Y',
        householdId: null,
        triggeringMessageId: 't-B',
      });
    });

    await waitFor(() => {
      expect(result.current.streams.get('t-A')?.status).toBe('sending');
      expect(result.current.streams.get('t-B')?.status).toBe('sending');
    });

    unmount();

    expect(aSignals[0].aborted).toBe(true);
    expect(bSignals[0].aborted).toBe(true);
  });

  it('transitions to error when the facade throws', async () => {
    async function* throwIterable(): AsyncIterable<string> {
      throw new Error('network down');
      yield ''; // unreachable; satisfies the AsyncIterable shape
    }
    mockStreamMomo.mockReturnValueOnce(throwIterable());

    const { result } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 't-1',
      });
    });

    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('error'),
    );
    expect(result.current.streams.get('t-1')?.error?.message).toBe(
      'network down',
    );
    expect(result.current.streams.get('t-1')?.text).toBe('');
  });

  it('surfaces non-OK responses propagated from the facade', async () => {
    async function* throwIterable(): AsyncIterable<string> {
      throw new Error('momo_stream_failed_401');
      yield '';
    }
    mockStreamMomo.mockReturnValueOnce(throwIterable());

    const { result } = renderHook(() => useMomoStream());

    act(() => {
      result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 't-1',
      });
    });

    await waitFor(() =>
      expect(result.current.streams.get('t-1')?.status).toBe('error'),
    );
    expect(result.current.streams.get('t-1')?.error?.message).toBe(
      'momo_stream_failed_401',
    );
  });
});
