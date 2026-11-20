import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseRecord } from '@lib-types/expenses';
import { act, renderHook } from '@testing-library/react';

const getExpensesByMessageIdsMock = jest.fn();
jest.mock('@/lib/data/expenses/client', () => ({
  __esModule: true,
  getExpensesByMessageIds: (...args: unknown[]) =>
    getExpensesByMessageIdsMock(...args),
}));

import { useExpenseLines } from './use-expense-lines';

function message(
  id: string,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id,
    household_id: null,
    user_id: 'u-1',
    content: `${id} 10`,
    status: 'processed',
    expense_count: 1,
    created_at: '2026-11-20T12:00:00Z',
    sender_name: 'Alex',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

function record(
  messageId: string,
  overrides: Partial<ExpenseRecord> = {},
): ExpenseRecord {
  return {
    id: `${messageId}-line`,
    household_id: null,
    user_id: 'u-1',
    chat_message_id: messageId,
    amount_cents: 1000,
    currency: 'USD',
    expense_date: '2026-11-20',
    merchant: null,
    category: 'dining',
    note: `${messageId} 10`,
    created_at: '2026-11-20T12:00:00Z',
    tags: [],
    ...overrides,
  };
}

/** Resolves the mock with lines for every requested id. */
function respondWithLines(
  overrides: (id: string) => Partial<ExpenseRecord> = () => ({}),
) {
  getExpensesByMessageIdsMock.mockImplementation(
    async ({ messageIds }: { messageIds: string[] }) => ({
      expensesByMessageId: Object.fromEntries(
        messageIds.map(id => [id, [record(id, overrides(id))]]),
      ),
    }),
  );
}

async function flushBatch() {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  getExpensesByMessageIdsMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useExpenseLines', () => {
  it('uses lines loaded with the page without fetching', async () => {
    const { result } = renderHook(() =>
      useExpenseLines({
        messages: [message('m-1')],
        initialRecords: { 'm-1': [record('m-1')] },
        enabled: true,
      }),
    );
    await flushBatch();

    expect(getExpensesByMessageIdsMock).not.toHaveBeenCalled();
    expect(result.current.linesByMessageId.get('m-1')?.[0].category).toBe(
      'dining',
    );
  });

  it('loads every missing message in one batched request', async () => {
    respondWithLines();
    const { result } = renderHook(() =>
      useExpenseLines({
        messages: [
          message('m-1'),
          message('m-2'),
          message('m-3', { expense_count: 0 }),
        ],
        enabled: true,
      }),
    );
    await flushBatch();

    expect(getExpensesByMessageIdsMock).toHaveBeenCalledTimes(1);
    expect(getExpensesByMessageIdsMock).toHaveBeenCalledWith({
      messageIds: ['m-1', 'm-2'],
    });
    expect(result.current.linesByMessageId.has('m-2')).toBe(true);
  });

  it('splits large loads into chunks of 100', async () => {
    respondWithLines();
    const messages = Array.from({ length: 150 }, (_, i) => message(`m-${i}`));
    renderHook(() => useExpenseLines({ messages, enabled: true }));
    await flushBatch();

    expect(getExpensesByMessageIdsMock).toHaveBeenCalledTimes(2);
    expect(
      getExpensesByMessageIdsMock.mock.calls[0][0].messageIds,
    ).toHaveLength(100);
    expect(
      getExpensesByMessageIdsMock.mock.calls[1][0].messageIds,
    ).toHaveLength(50);
  });

  it('waits until the panel is visible', async () => {
    respondWithLines();
    const { rerender } = renderHook(
      ({ enabled }) => useExpenseLines({ messages: [message('m-1')], enabled }),
      { initialProps: { enabled: false } },
    );
    await flushBatch();
    expect(getExpensesByMessageIdsMock).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await flushBatch();
    expect(getExpensesByMessageIdsMock).toHaveBeenCalledTimes(1);
  });

  it('reloads lines when a message status changes', async () => {
    respondWithLines(() => ({ category: null }));
    const { result, rerender } = renderHook(
      ({ messages }) => useExpenseLines({ messages, enabled: true }),
      {
        initialProps: {
          messages: [message('m-1', { status: 'needs_category' })],
        },
      },
    );
    await flushBatch();
    expect(result.current.linesByMessageId.get('m-1')?.[0].category).toBeNull();

    respondWithLines(() => ({ category: 'gifts' }));
    rerender({ messages: [message('m-1', { status: 'processed' })] });
    await flushBatch();
    expect(result.current.linesByMessageId.get('m-1')?.[0].category).toBe(
      'gifts',
    );
  });

  it('lets the newest request win when an older response arrives late', async () => {
    let resolveFirst: (value: unknown) => void = () => {
      // Replaced by the pending request's resolver below.
    };
    getExpensesByMessageIdsMock
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(async () => ({
        expensesByMessageId: { 'm-1': [record('m-1', { category: 'travel' })] },
      }));

    const { result } = renderHook(() =>
      useExpenseLines({ messages: [message('m-1')], enabled: true }),
    );
    await flushBatch();
    act(() => result.current.invalidate(['m-1']));
    await flushBatch();

    await act(async () => {
      resolveFirst({
        expensesByMessageId: { 'm-1': [record('m-1', { category: 'dining' })] },
      });
      await Promise.resolve();
    });

    expect(result.current.linesByMessageId.get('m-1')?.[0].category).toBe(
      'travel',
    );
  });

  it('shows a picked category until the server confirms it', async () => {
    respondWithLines(() => ({ category: null }));
    const { result } = renderHook(() =>
      useExpenseLines({
        messages: [message('m-1', { status: 'needs_category' })],
        enabled: true,
      }),
    );
    await flushBatch();

    act(() => result.current.overlayCategory('m-1-line', 'gifts'));
    expect(result.current.linesByMessageId.get('m-1')?.[0].category).toBe(
      'gifts',
    );

    act(() => result.current.clearOverlay('m-1-line'));
    expect(result.current.linesByMessageId.get('m-1')?.[0].category).toBeNull();
  });

  it('does not retry a failed load until the message changes', async () => {
    getExpensesByMessageIdsMock.mockResolvedValue({
      expensesByMessageId: {},
      errorCode: 'expenses_fetch_failed',
    });
    const { rerender } = renderHook(
      ({ messages }) => useExpenseLines({ messages, enabled: true }),
      { initialProps: { messages: [message('m-1')] } },
    );
    await flushBatch();
    rerender({ messages: [message('m-1')] });
    await flushBatch();
    expect(getExpensesByMessageIdsMock).toHaveBeenCalledTimes(1);

    rerender({ messages: [message('m-1', { expense_count: 2 })] });
    await flushBatch();
    expect(getExpensesByMessageIdsMock).toHaveBeenCalledTimes(2);
  });

  it('seeds lines that arrived with a send', () => {
    const { result } = renderHook(() =>
      useExpenseLines({ messages: [], enabled: true }),
    );
    act(() => result.current.seed(message('m-9'), [record('m-9')]));
    expect(result.current.linesByMessageId.get('m-9')).toHaveLength(1);
  });
});
