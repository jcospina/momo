import type { ChatMessage } from '@lib-types/chat';
import { act, renderHook } from '@testing-library/react';
import { useChatList } from './use-chat-list';

function buildMessage(id: string, createdAt: string): ChatMessage {
  return {
    id,
    household_id: null,
    user_id: 'u1',
    content: id,
    status: 'processed',
    expense_count: 0,
    created_at: createdAt,
    sender_name: null,
  };
}

describe('useChatList', () => {
  it('decrements firstItemIndex by prepended item count after loading completes', () => {
    const onLoadMore = jest.fn();
    const initialMessages = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
      buildMessage('m3', '2024-01-01T00:00:03.000Z'),
    ];

    const { result, rerender } = renderHook(
      ({ messages, isLoadingMore }) =>
        useChatList({
          messages,
          hasMore: true,
          isLoadingMore,
          onLoadMore,
          currentUserId: 'u1',
        }),
      {
        initialProps: { messages: initialMessages, isLoadingMore: false },
      },
    );

    const before = result.current.firstItemIndex;

    act(() => {
      result.current.handleRangeChanged({
        startIndex: before,
        endIndex: before + 2,
      });
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender({ messages: initialMessages, isLoadingMore: true });

    const prepended = [
      buildMessage('m-1', '2024-01-01T00:00:00.000Z'),
      buildMessage('m0', '2024-01-01T00:00:00.500Z'),
    ];

    rerender({
      messages: [...prepended, ...initialMessages],
      isLoadingMore: false,
    });

    expect(result.current.firstItemIndex).toBe(before - prepended.length);
  });

  it('decrements firstItemIndex in the same render that receives prepended items', () => {
    const initialMessages = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
      buildMessage('m3', '2024-01-01T00:00:03.000Z'),
    ];
    const prepended = [
      buildMessage('m-1', '2024-01-01T00:00:00.000Z'),
      buildMessage('m0', '2024-01-01T00:00:00.500Z'),
    ];

    const { result, rerender } = renderHook(
      ({ messages, isLoadingMore }) =>
        useChatList({
          messages,
          hasMore: true,
          isLoadingMore,
          onLoadMore: jest.fn(),
          currentUserId: 'u1',
        }),
      {
        initialProps: { messages: initialMessages, isLoadingMore: false },
      },
    );

    const before = result.current.firstItemIndex;

    rerender({ messages: initialMessages, isLoadingMore: true });
    rerender({
      messages: [...prepended, ...initialMessages],
      isLoadingMore: true,
    });

    expect(result.current.firstItemIndex).toBe(before - prepended.length);
  });

  it('keeps firstItemIndex when loading completes without new items', () => {
    const messages = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
    ];

    const { result, rerender } = renderHook(
      ({ isLoadingMore }) =>
        useChatList({
          messages,
          hasMore: true,
          isLoadingMore,
          onLoadMore: jest.fn(),
          currentUserId: 'u1',
        }),
      { initialProps: { isLoadingMore: false } },
    );

    const before = result.current.firstItemIndex;

    rerender({ isLoadingMore: true });
    rerender({ isLoadingMore: false });

    expect(result.current.firstItemIndex).toBe(before);
  });

  it('triggers load more only once for the same oldest item', () => {
    const onLoadMore = jest.fn();
    const messages = [
      buildMessage('m1', '2024-01-01T00:00:01.000Z'),
      buildMessage('m2', '2024-01-01T00:00:02.000Z'),
    ];

    const { result, rerender } = renderHook(
      ({ currentMessages }) =>
        useChatList({
          messages: currentMessages,
          hasMore: true,
          isLoadingMore: false,
          onLoadMore,
          currentUserId: 'u1',
        }),
      {
        initialProps: { currentMessages: messages },
      },
    );

    act(() => {
      const startIndex = result.current.firstItemIndex;
      result.current.handleRangeChanged({
        startIndex,
        endIndex: startIndex + 1,
      });
      result.current.handleRangeChanged({
        startIndex,
        endIndex: startIndex + 1,
      });
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    const older = [buildMessage('m0', '2024-01-01T00:00:00.000Z'), ...messages];
    rerender({ currentMessages: older });

    act(() => {
      const startIndex = result.current.firstItemIndex;
      result.current.handleRangeChanged({
        startIndex,
        endIndex: startIndex + 2,
      });
    });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('loads more near the top when Virtuoso offsets range indexes by firstItemIndex', () => {
    const onLoadMore = jest.fn();
    const messages = Array.from({ length: 30 }, (_, index) =>
      buildMessage(
        `m${index + 1}`,
        `2024-01-01T00:00:${String(index + 1).padStart(2, '0')}.000Z`,
      ),
    );

    const { result } = renderHook(() =>
      useChatList({
        messages,
        hasMore: true,
        isLoadingMore: false,
        onLoadMore,
        currentUserId: 'u1',
      }),
    );

    const firstItemIndex = result.current.firstItemIndex;

    act(() => {
      result.current.handleRangeChanged({
        startIndex: firstItemIndex + 6,
        endIndex: firstItemIndex + 12,
      });
    });
    expect(onLoadMore).not.toHaveBeenCalled();

    act(() => {
      result.current.handleRangeChanged({
        startIndex: firstItemIndex + 5,
        endIndex: firstItemIndex + 12,
      });
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
