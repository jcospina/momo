import { act, renderHook, waitFor } from '@testing-library/react';

import type { ChatMessage } from '@lib-types/chat';
import { useHouseholdSync } from './use-household-sync';

jest.mock('../api/chat-sync', () => ({
  fetchChatSync: jest.fn(),
}));

import { fetchChatSync } from '../api/chat-sync';

const mockFetchChatSync = fetchChatSync as jest.MockedFunction<
  typeof fetchChatSync
>;

const sampleMessage = (id: string): ChatMessage => ({
  id,
  household_id: 'hid',
  user_id: 'u1',
  content: `msg-${id}`,
  status: 'processed',
  expense_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  sender_name: 'User',
});

describe('useHouseholdSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchChatSync.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('queues a second sync during in-flight and runs after completion', async () => {
    mockFetchChatSync.mockResolvedValueOnce([sampleMessage('m1')]);
    mockFetchChatSync.mockResolvedValueOnce([sampleMessage('m2')]);
    const onMessages = jest.fn();
    const { result } = renderHook(() =>
      useHouseholdSync({
        householdId: 'hid',
        enabled: true,
        getCursor: () => ({ created_at: '2024-01-01T00:00:00.000Z', id: 'm0' }),
        onMessages,
      }),
    );

    act(() => {
      result.current.scheduleSync('visibility');
      result.current.scheduleSync('visibility');
    });

    await waitFor(() => expect(mockFetchChatSync).toHaveBeenCalledTimes(1));

    // second call is queued via pending + cooldown; advance timers to run it
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(mockFetchChatSync).toHaveBeenCalledTimes(2));
    expect(onMessages).toHaveBeenCalledTimes(2);
    expect(onMessages).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ id: 'm1' })]),
    );
    expect(onMessages).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([expect.objectContaining({ id: 'm2' })]),
    );
  });

  it('honors cooldown and triggers follow-up only when a trigger occurs during cooldown', async () => {
    mockFetchChatSync.mockResolvedValue([]);
    const onMessages = jest.fn();
    const { result } = renderHook(() =>
      useHouseholdSync({
        householdId: 'hid',
        enabled: true,
        getCursor: () => null,
        onMessages,
      }),
    );

    act(() => {
      result.current.scheduleSync('visibility');
    });
    await waitFor(() => expect(mockFetchChatSync).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.scheduleSync('visibility');
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    await waitFor(() => expect(mockFetchChatSync).toHaveBeenCalledTimes(2));
  });
});
