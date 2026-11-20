'use client';

import {
  type ExpenseLine,
  expectsLines,
  lineKey,
  toExpenseLines,
} from '@features/chat/lib/expense-lines';
import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseCategory, ExpenseRecord } from '@lib-types/expenses';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getExpensesByMessageIds } from '@/lib/data/expenses/client';

/** Matches the server action's cap; larger requests are split. */
export const EXPENSE_LINES_BATCH_SIZE = 100;

type Entry = {
  lines: ExpenseLine[];
  /** `lineKey(message)` when these lines were loaded. */
  key: string;
};

type UseExpenseLinesArgs = {
  /** The panel's messages, oldest first. */
  messages: ChatMessage[];
  /** Lines loaded with the page, keyed by message id. */
  initialRecords?: Record<string, ExpenseRecord[]>;
  /** Only the visible panel fetches; the other catches up when shown. */
  enabled: boolean;
};

export type UseExpenseLinesResult = {
  /** Lines per message, with any pending category picks already applied. */
  linesByMessageId: ReadonlyMap<string, ExpenseLine[]>;
  /** Stores lines that arrived with a message (e.g. the sender's own send). */
  seed: (message: ChatMessage, records: ExpenseRecord[]) => void;
  /** Re-fetches these messages' lines even if they look current. */
  invalidate: (messageIds: string[]) => void;
  /** Shows a category before the server confirms it. */
  overlayCategory: (lineId: string, category: ExpenseCategory) => void;
  /** Drops an optimistic category (e.g. the save failed). */
  clearOverlay: (lineId: string) => void;
};

function buildInitialEntries(
  messages: ChatMessage[],
  initialRecords: Record<string, ExpenseRecord[]> | undefined,
): Map<string, Entry> {
  const entries = new Map<string, Entry>();
  if (!initialRecords) return entries;
  for (const message of messages) {
    const records = initialRecords[message.id];
    if (!records || !expectsLines(message)) continue;
    entries.set(message.id, {
      lines: toExpenseLines(records, message.content),
      key: lineKey(message),
    });
  }
  return entries;
}

/**
 * Keeps each message's expense lines next to — not inside — the message
 * list: realtime and sync merges replace whole message objects, so lines
 * stored on them would be lost on every update.
 *
 * Lines are (re)loaded when a message gains expenses or its status / count
 * changes, and on explicit invalidation (realtime events, edits). Requests
 * are batched per tick and every id carries a sequence number, so an older
 * response can never overwrite a newer one.
 */
export function useExpenseLines({
  messages,
  initialRecords,
  enabled,
}: UseExpenseLinesArgs): UseExpenseLinesResult {
  const [entries, setEntries] = useState<ReadonlyMap<string, Entry>>(() =>
    buildInitialEntries(messages, initialRecords),
  );
  const [overlay, setOverlay] = useState<ReadonlyMap<string, ExpenseCategory>>(
    () => new Map(),
  );

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const queueRef = useRef(new Set<string>());
  /** id → sequence number of the request that owns it. */
  const inFlightRef = useRef(new Map<string, number>());
  /** id → line key whose load failed; retried only once the key changes. */
  const failedRef = useRef(new Map<string, string>());
  const seqRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (flushTimerRef.current !== null) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const commit = useCallback(
    (ids: string[], recordsById: Record<string, ExpenseRecord[]>) => {
      const byId = new Map(messagesRef.current.map(m => [m.id, m]));
      const loaded = new Map<string, Entry>();
      for (const id of ids) {
        const message = byId.get(id);
        if (!message) continue;
        loaded.set(id, {
          lines: toExpenseLines(recordsById[id] ?? [], message.content),
          key: lineKey(message),
        });
      }
      if (loaded.size === 0) return;

      setEntries(prev => {
        const next = new Map(prev);
        for (const [id, entry] of loaded) next.set(id, entry);
        return next;
      });

      // A pick is confirmed once the server returns the same category.
      const settled: string[] = [];
      for (const entry of loaded.values()) {
        for (const line of entry.lines) {
          if (overlayRef.current.get(line.id) === line.category) {
            settled.push(line.id);
          }
        }
      }
      if (settled.length > 0) {
        setOverlay(prev => {
          const next = new Map(prev);
          for (const lineId of settled) next.delete(lineId);
          return next;
        });
      }
    },
    [],
  );

  const markFailed = useCallback((ids: string[]) => {
    const byId = new Map(messagesRef.current.map(m => [m.id, m]));
    for (const id of ids) {
      const message = byId.get(id);
      if (message) failedRef.current.set(id, lineKey(message));
    }
  }, []);

  const flush = useCallback(() => {
    flushTimerRef.current = null;
    const ids = [...queueRef.current];
    queueRef.current.clear();

    for (let start = 0; start < ids.length; start += EXPENSE_LINES_BATCH_SIZE) {
      const chunk = ids.slice(start, start + EXPENSE_LINES_BATCH_SIZE);
      seqRef.current += 1;
      const seq = seqRef.current;
      for (const id of chunk) inFlightRef.current.set(id, seq);

      const ownedIds = () =>
        chunk.filter(id => inFlightRef.current.get(id) === seq);
      const release = (owned: string[]) => {
        for (const id of owned) inFlightRef.current.delete(id);
      };

      getExpensesByMessageIds({ messageIds: chunk })
        .then(result => {
          if (!mountedRef.current) return;
          const owned = ownedIds();
          release(owned);
          if (result.errorCode) {
            markFailed(owned);
            return;
          }
          commit(owned, result.expensesByMessageId);
        })
        .catch(error => {
          if (!mountedRef.current) return;
          console.warn('[chat] expense lines failed', error);
          const owned = ownedIds();
          release(owned);
          markFailed(owned);
        });
    }
  }, [commit, markFailed]);

  /** `force` re-requests ids already in flight (a newer request wins). */
  const enqueue = useCallback(
    (ids: string[], force: boolean) => {
      let added = false;
      for (const id of ids) {
        if (!force && inFlightRef.current.has(id)) continue;
        queueRef.current.add(id);
        added = true;
      }
      if (added && flushTimerRef.current === null) {
        flushTimerRef.current = setTimeout(flush, 0);
      }
    },
    [flush],
  );

  // Load what's missing or stale for the visible panel.
  useEffect(() => {
    if (!enabled) return;
    const stale: string[] = [];
    for (const message of messages) {
      if (!expectsLines(message)) continue;
      const key = lineKey(message);
      if (entries.get(message.id)?.key === key) continue;
      if (failedRef.current.get(message.id) === key) continue;
      stale.push(message.id);
    }
    if (stale.length > 0) enqueue(stale, false);
  }, [enabled, entries, enqueue, messages]);

  const seed = useCallback((message: ChatMessage, records: ExpenseRecord[]) => {
    if (!expectsLines(message)) return;
    setEntries(prev => {
      const next = new Map(prev);
      next.set(message.id, {
        lines: toExpenseLines(records, message.content),
        key: lineKey(message),
      });
      return next;
    });
  }, []);

  const invalidate = useCallback(
    (messageIds: string[]) => {
      for (const id of messageIds) failedRef.current.delete(id);
      if (messageIds.length > 0) enqueue(messageIds, true);
    },
    [enqueue],
  );

  const overlayCategory = useCallback(
    (lineId: string, category: ExpenseCategory) => {
      setOverlay(prev => new Map(prev).set(lineId, category));
    },
    [],
  );

  const clearOverlay = useCallback((lineId: string) => {
    setOverlay(prev => {
      if (!prev.has(lineId)) return prev;
      const next = new Map(prev);
      next.delete(lineId);
      return next;
    });
  }, []);

  const linesByMessageId = useMemo(() => {
    const result = new Map<string, ExpenseLine[]>();
    for (const [id, entry] of entries) {
      result.set(
        id,
        overlay.size === 0
          ? entry.lines
          : entry.lines.map(line => {
              const picked = overlay.get(line.id);
              return picked ? { ...line, category: picked } : line;
            }),
      );
    }
    return result;
  }, [entries, overlay]);

  return { linesByMessageId, seed, invalidate, overlayCategory, clearOverlay };
}
