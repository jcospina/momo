'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { streamMomo } from '@/lib/data/messages/client';

export type MomoStreamStatus = 'sending' | 'streaming' | 'done' | 'error';

export type MomoStreamState = {
  status: MomoStreamStatus;
  text: string;
  error: Error | null;
};

export type StartInput = {
  content: string;
  householdId: string | null;
  triggeringMessageId: string;
};

export type UseMomoStreamResult = {
  /**
   * Read-only view of all in-flight or completed streams in the lifetime of
   * this hook instance, keyed by `triggeringMessageId`.
   */
  streams: ReadonlyMap<string, MomoStreamState>;

  /**
   * Starts a new stream. If a stream with the same `triggeringMessageId` is
   * already in flight (status `sending` or `streaming`), this is a no-op —
   * we avoid the redundant fetch and rely on the DB layer's idempotency key
   * for defense in depth.
   *
   * Streams keyed by different `triggeringMessageId`s run in parallel, each
   * with its own `AbortController`.
   */
  start: (input: StartInput) => void;

  /**
   * Aborts a specific in-flight stream. No-op if the stream is not in flight.
   */
  abort: (triggeringMessageId: string) => void;
};

type InternalEntry = {
  controller: AbortController;
  state: MomoStreamState;
};

type MomoStreamStateUpdater = (
  update: (prev: MomoStreamState) => MomoStreamState,
) => void;

/**
 * Drives a single MoMo stream from `sending` through `streaming` to its
 * terminal state (`done` or `error`). The helper owns one responsibility:
 * translate stream chunks/errors/completion into `MomoStreamState`
 * transitions and emit them through `setState`. It is intentionally unaware
 * of how those transitions are stored — the caller decides.
 */
async function runStream(
  signal: AbortSignal,
  input: StartInput,
  setState: MomoStreamStateUpdater,
): Promise<void> {
  try {
    const iterable = streamMomo({
      content: input.content,
      householdId: input.householdId,
      triggeringMessageId: input.triggeringMessageId,
      signal,
    });

    let receivedFirstChunk = false;
    for await (const chunk of iterable) {
      if (signal.aborted) return;
      if (!receivedFirstChunk) {
        receivedFirstChunk = true;
        setState(prev => ({ ...prev, status: 'streaming' }));
      }
      setState(prev => ({ ...prev, text: prev.text + chunk }));
    }

    if (signal.aborted) return;
    setState(prev => ({ ...prev, status: 'done' }));
  } catch (err) {
    if (signal.aborted) return;
    const error = err instanceof Error ? err : new Error(String(err));
    setState(prev => ({ ...prev, status: 'error', error }));
  }
}

/**
 * Streams MoMo replies from `/api/momo-stream` via the messages facade.
 *
 * Multi-stream: multiple `@momo` mentions can stream concurrently, each
 * keyed by its `triggeringMessageId`. Starting stream B never aborts a
 * still-in-flight stream A, and `abort(id)` targets only the named stream.
 */
export function useMomoStream(): UseMomoStreamResult {
  // Authoritative storage. We keep both the `AbortController` and the latest
  // `MomoStreamState` in this ref-held map so synchronous reads in `start()`
  // and `abort()` see the live state without depending on the render cycle.
  const entriesRef = useRef<Map<string, InternalEntry>>(new Map());

  // Reactive snapshot exposed to consumers. We swap to a new Map on every
  // update so React (and `useEffect` deps) detect the change.
  const [streams, setStreams] = useState<ReadonlyMap<string, MomoStreamState>>(
    () => new Map(),
  );

  // Tracks whether the hook is still mounted so we can ignore late state
  // updates from in-flight async iterators after unmount.
  const mountedRef = useRef(true);

  const publish = useCallback(() => {
    if (!mountedRef.current) return;
    const next = new Map<string, MomoStreamState>();
    for (const [id, entry] of entriesRef.current) {
      next.set(id, entry.state);
    }
    setStreams(next);
  }, []);

  const start = useCallback(
    (input: StartInput) => {
      const { triggeringMessageId } = input;
      const existing = entriesRef.current.get(triggeringMessageId);
      if (
        existing &&
        (existing.state.status === 'sending' ||
          existing.state.status === 'streaming')
      ) {
        // Duplicate-request guard: don't re-fetch a stream that is already
        // running for this trigger.
        return;
      }

      const controller = new AbortController();
      const entry: InternalEntry = {
        controller,
        state: { status: 'sending', text: '', error: null },
      };
      entriesRef.current.set(triggeringMessageId, entry);
      publish();

      // Bridge runStream's state setter to this hook's entries-map storage.
      // If the entry was removed (e.g. by abort()), the update is dropped —
      // defense in depth on top of runStream's own `signal.aborted` checks.
      const updateEntryState: MomoStreamStateUpdater = updater => {
        const current = entriesRef.current.get(triggeringMessageId);
        if (!current) return;
        current.state = updater(current.state);
        publish();
      };

      void runStream(controller.signal, input, updateEntryState);
    },
    [publish],
  );

  const abort = useCallback(
    (triggeringMessageId: string) => {
      const entry = entriesRef.current.get(triggeringMessageId);
      if (!entry) return;
      const { status } = entry.state;
      if (status !== 'sending' && status !== 'streaming') return;
      entry.controller.abort();
      // Drop the aborted stream from the map so consumers can tell it's gone
      // and so a follow-up `start()` with the same id can proceed.
      entriesRef.current.delete(triggeringMessageId);
      publish();
    },
    [publish],
  );

  // Cleanup: abort everything in flight when the hook unmounts. We reset
  // `mountedRef` to `true` on mount as well so React 18 StrictMode (which
  // mounts → unmounts → remounts effects in dev) leaves the ref in the
  // correct state after the second mount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const entry of entriesRef.current.values()) {
        if (
          entry.state.status === 'sending' ||
          entry.state.status === 'streaming'
        ) {
          entry.controller.abort();
        }
      }
      entriesRef.current.clear();
    };
  }, []);

  return { streams, start, abort };
}
