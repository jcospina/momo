import type { ChatMessage } from '@lib-types/chat';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getSince as getChatSince } from '@/lib/data/messages/client';
import { useHouseholdSync } from './use-household-sync';

jest.mock('@/lib/data/messages/client', () => ({
  getSince: jest.fn(),
}));

const mockGetChatSince = getChatSince as jest.MockedFunction<
  typeof getChatSince
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
  author_kind: 'user',
  momo_source: null,
  momo_invocation_tagged: false,
  idempotency_key: null,
});

describe('useHouseholdSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetChatSince.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('queues a second sync during in-flight and runs after completion', async () => {
    mockGetChatSince.mockResolvedValueOnce([sampleMessage('m1')]);
    mockGetChatSince.mockResolvedValueOnce([sampleMessage('m2')]);
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

    await waitFor(() => expect(mockGetChatSince).toHaveBeenCalledTimes(1));

    // second call is queued via pending + cooldown; advance timers to run it
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(mockGetChatSince).toHaveBeenCalledTimes(2));
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
    mockGetChatSince.mockResolvedValue([]);
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
    await waitFor(() => expect(mockGetChatSince).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.scheduleSync('visibility');
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    await waitFor(() => expect(mockGetChatSince).toHaveBeenCalledTimes(2));
  });
});
