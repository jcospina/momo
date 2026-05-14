'use client';

import { useCallback, useRef, useState } from 'react';

import { streamMomo } from '@/lib/data/messages/client';
import type { StreamMomoInput } from '@/lib/data/messages/types';

export type MomoStreamStatus =
  | 'idle'
  | 'sending'
  | 'streaming'
  | 'done'
  | 'error';

export type UseMomoStreamResult = {
  status: MomoStreamStatus;
  text: string;
  error: string | null;
  start: (input: StartInput) => Promise<void>;
  abort: () => void;
};

type StartInput = Omit<StreamMomoInput, 'signal'>;

/**
 * Streams a Momo reply from `/api/momo-stream` via the messages facade.
 *
 * State machine: `idle → sending → streaming → done | error`.
 *
 * `start()` is idempotent across invocations: a second call aborts the
 * previous stream, resets `text` to `''`, and starts fresh. `abort()`
 * cancels the in-flight request and transitions the hook back to `idle`
 * (the plan permits either `idle` or `error`; `idle` matches the "never
 * started, or `abort()` was called" semantics documented for the state).
 */
export function useMomoStream(): UseMomoStreamResult {
  const [status, setStatus] = useState<MomoStreamStatus>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controllerRef.current = null;
    controller.abort();
    setStatus('idle');
  }, []);

  const start = useCallback(async (input: StartInput) => {
    // Abort any in-flight stream before starting a new one. We don't reuse
    // `abort()` here because it would flip status to `idle` after we set
    // `sending` below, depending on microtask ordering.
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setText('');
    setError(null);
    setStatus('sending');

    try {
      const iterable = streamMomo({
        content: input.content,
        householdId: input.householdId,
        triggeringMessageId: input.triggeringMessageId,
        signal: controller.signal,
      });

      let receivedFirstChunk = false;
      for await (const chunk of iterable) {
        if (controller.signal.aborted) return;
        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          setStatus('streaming');
        }
        setText(prev => prev + chunk);
      }

      if (controller.signal.aborted) return;
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('error');
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, []);

  return { status, text, error, start, abort };
}
