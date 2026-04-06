import type { ChatMessage } from '@lib-types/chat';
import { act, renderHook } from '@testing-library/react';
import { useChatState } from './use-chat-state';

const baseMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'm0',
  household_id: 'hid',
  user_id: 'u0',
  content: 'base',
  status: 'processed',
  expense_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  sender_name: 'User',
  ...overrides,
});

describe('useChatState', () => {
  const initialHouseholdMessages: ChatMessage[] = [
    baseMessage({
      id: 'm1',
      created_at: '2024-01-01T00:00:01.000Z',
    }),
    baseMessage({
      id: 'm2',
      created_at: '2024-01-01T00:00:02.000Z',
    }),
  ];

  it('handles optimistic, reconcile, and cursor updates', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages,
      }),
    );

    // Initial cursor should be newest initial message (m2)
    expect(result.current.householdCursorRef.current).toEqual({
      created_at: '2024-01-01T00:00:02.000Z',
      id: 'm2',
    });

    // Optimistic add should not advance cursor
    let tempId = '';
    act(() => {
      const res = result.current.addOptimistic('hello');
      tempId = res.tempId;
    });
    expect(tempId.startsWith('tmp-')).toBe(true);
    expect(result.current.householdCursorRef.current).toEqual({
      created_at: '2024-01-01T00:00:02.000Z',
      id: 'm2',
    });
    const latest = result.current.householdMessages.at(-1);
    expect(latest?.status).toBe('pending');

    // Reconcile should replace optimistic and advance cursor
    const serverMessage = baseMessage({
      id: 'srv1',
      content: 'hello',
      created_at: '2024-01-01T00:00:03.000Z',
      user_id: 'u1',
    });
    act(() => {
      result.current.reconcile(tempId, serverMessage);
    });
    expect(
      result.current.householdMessages.find(m => m.id === tempId),
    ).toBeUndefined();
    expect(
      result.current.householdMessages.find(m => m.id === 'srv1'),
    ).toBeDefined();
    expect(result.current.householdCursorRef.current).toEqual({
      created_at: '2024-01-01T00:00:03.000Z',
      id: 'srv1',
    });
  });

  it('merges realtime updates without duplicates', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages,
      }),
    );

    const updateMessage = baseMessage({
      id: 'm2',
      content: 'updated',
      created_at: '2024-01-01T00:00:02.000Z',
    });
    act(() => {
      result.current.mergeRealtime(updateMessage);
    });
    const updated = result.current.householdMessages.find(m => m.id === 'm2');
    expect(updated?.content).toBe('updated');

    const newMessage = baseMessage({
      id: 'm3',
      content: 'new',
      created_at: '2024-01-01T00:00:03.000Z',
    });
    act(() => {
      result.current.mergeRealtime(newMessage);
    });
    expect(
      result.current.householdMessages.find(m => m.id === 'm3'),
    ).toBeDefined();
  });

  it('merges batch with dedupe and sorting', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages: [
          baseMessage({
            id: 'm1',
            created_at: '2024-01-01T00:00:02.000Z',
          }),
        ],
      }),
    );

    act(() => {
      result.current.mergeBatch([
        baseMessage({
          id: 'm1',
          content: 'updated',
          created_at: '2024-01-01T00:00:02.000Z',
        }),
        baseMessage({
          id: 'm0',
          created_at: '2024-01-01T00:00:01.000Z',
        }),
        baseMessage({
          id: 'm2',
          created_at: '2024-01-01T00:00:03.000Z',
        }),
      ]);
    });

    const ids = result.current.householdMessages.map(m => m.id);
    expect(ids).toEqual(['m0', 'm1', 'm2']);
    const updated = result.current.householdMessages.find(m => m.id === 'm1');
    expect(updated?.content).toBe('updated');
  });

  it('keeps optimistic order when an earlier message reconciles first', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages: [],
      }),
    );

    let firstTempId = '';
    let secondTempId = '';

    act(() => {
      firstTempId = result.current.addOptimistic('first').tempId;
      secondTempId = result.current.addOptimistic('second').tempId;
    });

    const serverMessage = baseMessage({
      id: 'srv-1',
      content: 'first',
      created_at: '2024-01-01T00:00:01.000Z',
      user_id: 'u1',
    });

    act(() => {
      result.current.reconcile(firstTempId, serverMessage);
    });

    const ids = result.current.householdMessages.map(m => m.id);
    expect(ids.indexOf(serverMessage.id)).toBeLessThan(
      ids.indexOf(secondTempId),
    );
  });

  it('drops optimistic duplicate when realtime arrives before reconcile', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages: [],
      }),
    );

    let tempId = '';
    const serverMessage = baseMessage({
      id: 'srv-dup',
      content: 'race',
      created_at: '2024-01-01T00:00:01.000Z',
      user_id: 'u1',
    });

    act(() => {
      tempId = result.current.addOptimistic('race').tempId;
      result.current.mergeRealtime(serverMessage);
    });

    act(() => {
      result.current.reconcile(tempId, serverMessage);
    });

    const ids = result.current.householdMessages.map(m => m.id);
    expect(ids.filter(id => id === serverMessage.id)).toHaveLength(1);
    expect(ids.some(id => id === tempId)).toBe(false);
  });

  it('replaces optimistic message when realtime arrives first', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages: [],
      }),
    );

    let tempId = '';
    const serverMessage = baseMessage({
      id: 'srv-rt',
      content: 'race',
      created_at: new Date().toISOString(),
      user_id: 'u1',
    });

    act(() => {
      tempId = result.current.addOptimistic('race').tempId;
    });

    act(() => {
      result.current.mergeRealtime(serverMessage);
    });

    const ids = result.current.householdMessages.map(m => m.id);
    expect(ids).toContain('srv-rt');
    expect(ids).not.toContain(tempId);
  });

  it('toggles optimistic status between failed and pending', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages: [],
      }),
    );

    let tempId = '';
    act(() => {
      tempId = result.current.addOptimistic('retry me').tempId;
      result.current.markFailed(tempId);
    });

    const failed = result.current.householdMessages.find(m => m.id === tempId);
    expect(failed?.status).toBe('failed');

    act(() => {
      result.current.markPending(tempId);
    });

    const pending = result.current.householdMessages.find(m => m.id === tempId);
    expect(pending?.status).toBe('pending');
  });

  it('updates a message status in-place', () => {
    const { result } = renderHook(() =>
      useChatState({
        userId: 'u1',
        householdId: 'hid',
        initialPersonalMessages: [],
        initialHouseholdMessages: [
          baseMessage({
            id: 'm-status',
            status: 'needs_category',
            expense_count: 1,
          }),
        ],
      }),
    );

    act(() => {
      result.current.setMessageStatus('m-status', 'processed');
    });

    const updated = result.current.householdMessages.find(
      message => message.id === 'm-status',
    );
    expect(updated?.status).toBe('processed');
  });
});
