import { ReadableStream } from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';

import { act, renderHook, waitFor } from '@testing-library/react';

import { useMomoStream } from './use-momo-stream';

// jsdom doesn't ship `TextEncoder`, `TextDecoder`, or `ReadableStream`
// natively. Pull them from Node so we can build streaming response fixtures
// and so the facade's `new TextDecoder()` resolves. `Response` is not needed:
// the facade only reads `.ok`, `.status`, and `.body`, so a minimal
// duck-typed object suffices.
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

type FakeResponse = {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeStreamResponse(
  chunks: Array<string | Uint8Array>,
  init: { status?: number } = {},
): FakeResponse {
  const status = init.status ?? 200;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk,
        );
      }
      controller.close();
    },
  });
  return { ok: status >= 200 && status < 300, status, body: stream };
}

function makeControlledStreamResponse(init: { status?: number } = {}): {
  response: FakeResponse;
  push: (chunk: string) => void;
  close: () => void;
} {
  const status = init.status ?? 200;
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });
  return {
    response: { ok: status >= 200 && status < 300, status, body: stream },
    push: (chunk: string) => controllerRef?.enqueue(encoder.encode(chunk)),
    close: () => controllerRef?.close(),
  };
}

describe('useMomoStream', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('accumulates chunks and transitions sending → streaming → done', async () => {
    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) =>
      makeStreamResponse(['hello ', 'momo']),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMomoStream());

    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/momo-stream',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(init).toBeDefined();
    if (!init) throw new Error('expected fetch init');
    expect(JSON.parse(init.body as string)).toEqual({
      content: '@momo hi',
      householdId: null,
      triggeringMessageId: 'trigger-1',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);

    expect(result.current.status).toBe('done');
    expect(result.current.text).toBe('hello momo');
    expect(result.current.error).toBeNull();
  });

  it('reports streaming state while chunks are arriving', async () => {
    const controlled = makeControlledStreamResponse();
    const fetchMock = jest.fn(async () => controlled.response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMomoStream());

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      });
    });

    await act(async () => {
      controlled.push('first ');
    });

    await waitFor(() => expect(result.current.status).toBe('streaming'));
    expect(result.current.text).toBe('first ');

    await act(async () => {
      controlled.push('second');
      controlled.close();
      await startPromise;
    });

    expect(result.current.status).toBe('done');
    expect(result.current.text).toBe('first second');
  });

  it('transitions to error when fetch rejects', async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error('network down');
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMomoStream());

    await act(async () => {
      await result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network down');
    expect(result.current.text).toBe('');
  });

  it('transitions to error on a non-OK response', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 401,
      body: null,
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMomoStream());

    await act(async () => {
      await result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('momo_stream_failed_401');
  });

  it('aborts an in-flight stream and returns to idle', async () => {
    const fetchCalls: AbortSignal[] = [];
    const responseDeferred = deferred<FakeResponse>();
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal) fetchCalls.push(init.signal);
      return responseDeferred.promise;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMomoStream());

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      });
    });

    await waitFor(() => expect(result.current.status).toBe('sending'));
    expect(fetchCalls).toHaveLength(1);
    const signal = fetchCalls[0];
    expect(signal.aborted).toBe(false);

    await act(async () => {
      result.current.abort();
      // Unblock the pending fetch so the start() async flow can settle.
      responseDeferred.resolve(makeStreamResponse(['late chunk']));
      await startPromise;
    });

    expect(signal.aborted).toBe(true);
    expect(result.current.status).toBe('idle');
    expect(result.current.text).toBe('');
  });

  it('start() is idempotent: a second call aborts the prior stream and resets text', async () => {
    const signals: AbortSignal[] = [];
    const firstResponseDeferred = deferred<FakeResponse>();
    let callIndex = 0;
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      const isFirst = callIndex === 0;
      callIndex += 1;
      if (isFirst) return firstResponseDeferred.promise;
      return makeStreamResponse(['second-run']);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMomoStream());

    let firstStart!: Promise<void>;
    act(() => {
      firstStart = result.current.start({
        content: 'first',
        householdId: null,
        triggeringMessageId: 't-1',
      });
    });

    await waitFor(() => expect(signals).toHaveLength(1));

    await act(async () => {
      await result.current.start({
        content: 'second',
        householdId: null,
        triggeringMessageId: 't-2',
      });
      // Settle the (now aborted) first request.
      firstResponseDeferred.resolve(makeStreamResponse(['stale']));
      await firstStart;
    });

    expect(signals[0].aborted).toBe(true);
    expect(result.current.status).toBe('done');
    expect(result.current.text).toBe('second-run');
  });
});
