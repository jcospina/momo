import {
  distanceFromBottom,
  flushScrollEvents,
  installFakeScrollLayout,
  userScrollTo,
  viewportTop,
} from '@features/chat/lib/fake-scroll-layout.test-helper';
import type { ChatMessage } from '@lib-types/chat';
import { act, render } from '@testing-library/react';
import { MIN_PREFETCH_DISTANCE_PX, useChatScroll } from './use-chat-scroll';

const CLIENT_HEIGHT = 300;
const ROW_HEIGHT = 50;
const ME = 'me';
const SOMEONE_ELSE = 'someone-else';
const BASE_TIME = Date.UTC(2026, 0, 1);

let restoreLayout: () => void;

beforeAll(() => {
  restoreLayout = installFakeScrollLayout();
});

afterAll(() => {
  restoreLayout();
});

function buildMessage(
  index: number,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: `m${index}`,
    household_id: null,
    user_id: SOMEONE_ELSE,
    content: `message ${index}`,
    status: 'processed',
    expense_count: 0,
    created_at: new Date(BASE_TIME + index * 1000).toISOString(),
    sender_name: null,
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

/** Messages `m{from}` through `m{to}`, oldest first. */
function history(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) =>
    buildMessage(from + i),
  );
}

type HarnessProps = {
  messages: ChatMessage[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  isActive?: boolean;
};

/** Same structure as `ChatList`: scroller > row container > one row per message. */
function Harness({
  messages,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  isActive = true,
}: HarnessProps) {
  const { scrollerRef, onScroll } = useChatScroll({
    messages,
    currentUserId: ME,
    hasMore,
    isLoadingMore,
    onLoadMore,
    isActive,
  });
  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      data-testid="scroller"
      data-fake-client-height={CLIENT_HEIGHT}
      style={isActive ? undefined : { display: 'none' }}
    >
      <div>
        {messages.map(message => (
          <div
            key={message.id}
            data-testid={message.id}
            data-fake-height={ROW_HEIGHT}
          >
            {message.content}
          </div>
        ))}
      </div>
    </div>
  );
}

async function renderList(props: HarnessProps) {
  const utils = render(<Harness {...props} />);
  await act(flushScrollEvents);
  const scroller = utils.getByTestId('scroller');

  const update = async (next: HarnessProps) => {
    await act(async () => {
      utils.rerender(<Harness {...next} />);
      await flushScrollEvents();
    });
  };
  const scrollTo = async (top: number) => {
    await act(() => userScrollTo(scroller, top));
  };

  return { ...utils, scroller, update, scrollTo };
}

describe('useChatScroll — following and keeping place', () => {
  it('opens at the latest message', async () => {
    const { scroller } = await renderList({ messages: history(0, 19) });

    expect(scroller.scrollTop).toBe(20 * ROW_HEIGHT - CLIENT_HEIGHT);
    expect(distanceFromBottom(scroller)).toBe(0);
  });

  it("keeps the reader's place when older messages are prepended", async () => {
    const messages = history(0, 19);
    const { scroller, update, scrollTo, getByTestId } = await renderList({
      messages,
    });
    await scrollTo(600);
    const watched = getByTestId('m12');
    const topBefore = viewportTop(watched);

    await update({ messages: [...history(-10, -1), ...messages] });

    expect(viewportTop(watched)).toBe(topBefore);
    expect(scroller.scrollTop).toBe(600 + 10 * ROW_HEIGHT);
  });

  it('follows new messages while the reader is at the bottom', async () => {
    const messages = history(0, 19);
    const { scroller, update } = await renderList({ messages });

    await update({ messages: [...messages, buildMessage(20)] });

    expect(distanceFromBottom(scroller)).toBe(0);
  });

  it("stays put when someone else's message arrives while scrolled up", async () => {
    const messages = history(0, 19);
    const { scroller, update, scrollTo } = await renderList({ messages });
    await scrollTo(600);

    await update({ messages: [...messages, buildMessage(20)] });

    expect(scroller.scrollTop).toBe(600);
  });

  it('stays put when a MoMo reply arrives while scrolled up', async () => {
    const messages = history(0, 19);
    const { scroller, update, scrollTo } = await renderList({ messages });
    await scrollTo(600);

    // MoMo replies are stored under the id of the user who mentioned @momo.
    const momoReply = buildMessage(20, { user_id: ME, author_kind: 'momo' });
    await update({ messages: [...messages, momoReply] });

    expect(scroller.scrollTop).toBe(600);
  });

  it('jumps to the latest message when the user sends one while scrolled up', async () => {
    const messages = history(0, 19);
    const { scroller, update, scrollTo } = await renderList({ messages });
    await scrollTo(600);

    const sent = buildMessage(20, { id: 'tmp-1', user_id: ME });
    await update({ messages: [...messages, sent] });

    expect(distanceFromBottom(scroller)).toBe(0);
  });

  it('stays put when the optimistic message is swapped for the saved one', async () => {
    const messages = history(0, 19);
    const optimistic = buildMessage(20, {
      id: 'tmp-1',
      user_id: ME,
      status: 'pending',
    });
    const { scroller, update, scrollTo } = await renderList({
      messages: [...messages, optimistic],
    });
    await scrollTo(600);

    const saved = {
      ...optimistic,
      id: 'saved-1',
      status: 'processed' as const,
    };
    await update({ messages: [...messages, saved] });

    expect(scroller.scrollTop).toBe(600);
  });

  it('returns to the latest message when its panel becomes active again', async () => {
    const messages = history(0, 19);
    const { scroller, update, scrollTo } = await renderList({ messages });
    await scrollTo(600);

    await update({ messages, isActive: false });
    await update({ messages, isActive: true });

    expect(distanceFromBottom(scroller)).toBe(0);
  });

  it('opens at the latest message when its panel starts hidden', async () => {
    const messages = history(0, 19);
    const { scroller, update } = await renderList({
      messages,
      isActive: false,
    });

    await update({ messages, isActive: true });

    expect(distanceFromBottom(scroller)).toBe(0);
  });
});

describe('useChatScroll — loading older messages', () => {
  // 40 rows of 50px: the end is at scrollTop 1700.
  const messages = history(0, 39);

  it('asks once the reader is within the prefetch distance of the top', async () => {
    const onLoadMore = jest.fn();
    const { scrollTo } = await renderList({
      messages,
      hasMore: true,
      onLoadMore,
    });

    await scrollTo(MIN_PREFETCH_DISTANCE_PX + 1);
    expect(onLoadMore).not.toHaveBeenCalled();

    await scrollTo(MIN_PREFETCH_DISTANCE_PX);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('asks once per oldest message, and again after older ones arrive', async () => {
    const onLoadMore = jest.fn();
    const { update, scrollTo } = await renderList({
      messages,
      hasMore: true,
      onLoadMore,
    });

    await scrollTo(400);
    await scrollTo(300);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Ten older rows push the reader 500px down, out of the prefetch range.
    await update({
      messages: [...history(-10, -1), ...messages],
      hasMore: true,
      onLoadMore,
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    await scrollTo(200);
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('asks again without a scroll when a page lands and the reader is still near the top', async () => {
    const onLoadMore = jest.fn();
    const { update, scrollTo } = await renderList({
      messages,
      hasMore: true,
      onLoadMore,
    });
    await scrollTo(0);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Two older rows keep the reader 100px from the top.
    await update({
      messages: [...history(-2, -1), ...messages],
      hasMore: true,
      onLoadMore,
    });

    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('does not ask while a page is loading', async () => {
    const onLoadMore = jest.fn();
    const { scrollTo } = await renderList({
      messages,
      hasMore: true,
      isLoadingMore: true,
      onLoadMore,
    });

    await scrollTo(100);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not ask when there is no older history', async () => {
    const onLoadMore = jest.fn();
    const { scrollTo } = await renderList({
      messages,
      hasMore: false,
      onLoadMore,
    });

    await scrollTo(100);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not ask from a hidden panel', async () => {
    const onLoadMore = jest.fn();
    await renderList({
      messages: history(0, 2),
      hasMore: true,
      onLoadMore,
      isActive: false,
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('asks right away when the history is shorter than the viewport', async () => {
    const onLoadMore = jest.fn();
    await renderList({ messages: history(0, 2), hasMore: true, onLoadMore });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
