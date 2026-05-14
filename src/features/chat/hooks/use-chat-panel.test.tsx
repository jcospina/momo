import type { ChatMessage } from '@lib-types/chat';
import { act, renderHook } from '@testing-library/react';

const startSpy = jest.fn();
const abortSpy = jest.fn();
let streamsValue: ReadonlyMap<
  string,
  { status: string; text: string; error: Error | null }
> = new Map();

jest.mock('@hooks/use-momo-stream', () => ({
  __esModule: true,
  useMomoStream: () => ({
    streams: streamsValue,
    start: startSpy,
    abort: abortSpy,
  }),
}));

// Stub realtime/sync hooks. The panel hook mounts them unconditionally but
// they require a realtime provider; the send/retry behaviour we are testing
// is independent of them, so a no-op shape is enough.
jest.mock('./use-household-realtime', () => ({
  useHouseholdRealtime: jest.fn(),
}));
jest.mock('./use-personal-realtime', () => ({
  usePersonalRealtime: jest.fn(),
}));
jest.mock('./use-personal-sync', () => ({
  usePersonalSync: () => ({ scheduleSync: jest.fn() }),
}));
jest.mock('./use-household-sync', () => ({
  useHouseholdSync: () => ({ scheduleSync: jest.fn() }),
}));

const sendChatMessageMock = jest.fn();
jest.mock('@/lib/data/messages/client', () => ({
  __esModule: true,
  getList: jest.fn(),
  remove: jest.fn(),
  send: (...args: unknown[]) => sendChatMessageMock(...args),
}));

import { useChatPanel } from './use-chat-panel';

type PanelReturn = ReturnType<typeof useChatPanel>;

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'srv-1',
    household_id: null,
    user_id: 'user-1',
    content: 'groceries 20',
    status: 'processed',
    expense_count: 0,
    created_at: '2026-05-14T00:00:00.000Z',
    sender_name: 'User',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
    ...overrides,
  };
}

function renderPanel(initialMessages: ChatMessage[] = []) {
  return renderHook(() =>
    useChatPanel({
      scope: 'personal',
      userId: 'user-1',
      householdId: null,
      initialMessages,
      isActive: true,
    }),
  );
}

async function submitDraft(result: { current: PanelReturn }, content: string) {
  act(() => {
    result.current.setDraft(content);
  });
  await act(async () => {
    const fakeEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;
    // Re-read result.current after setDraft so handleSubmit captures the
    // updated draft (it's recreated each render).
    result.current.handleSubmit(fakeEvent);
    // Yield so the composer's async onSend can resolve.
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useChatPanel — @momo send wiring', () => {
  beforeEach(() => {
    startSpy.mockClear();
    abortSpy.mockClear();
    sendChatMessageMock.mockReset();
    streamsValue = new Map();
  });

  it('does not start a stream when an untagged message is sent', async () => {
    const serverMessage = buildMessage({ content: 'groceries 20' });
    sendChatMessageMock.mockResolvedValue({ message: serverMessage });

    const { result } = renderPanel();
    await submitDraft(result, 'groceries 20');

    expect(sendChatMessageMock).toHaveBeenCalledWith({
      content: 'groceries 20',
      householdId: null,
    });
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('starts a stream with the full content when the server marks the row as tagged', async () => {
    const serverMessage = buildMessage({
      id: 'srv-tagged-1',
      content: '@momo how much did I spend?',
      momo_invocation_tagged: true,
      status: 'processed',
    });
    sendChatMessageMock.mockResolvedValue({ message: serverMessage });

    const { result } = renderPanel();
    await submitDraft(result, '@momo how much did I spend?');

    expect(sendChatMessageMock).toHaveBeenCalledWith({
      content: '@momo how much did I spend?',
      householdId: null,
    });
    expect(startSpy).toHaveBeenCalledWith({
      content: '@momo how much did I spend?',
      householdId: null,
      triggeringMessageId: 'srv-tagged-1',
    });
  });

  it('does not start a stream when the send returned an errorCode', async () => {
    sendChatMessageMock.mockResolvedValue({
      errorCode: 'chat_message_send_failed',
    });

    const { result } = renderPanel();
    await submitDraft(result, '@momo hello');

    expect(startSpy).not.toHaveBeenCalled();
  });

  it('starts a stream when retrying a tagged optimistic message that previously failed', async () => {
    sendChatMessageMock.mockResolvedValueOnce({
      errorCode: 'chat_message_send_failed',
    });
    const { result } = renderPanel();
    await submitDraft(result, '@momo hi');

    const optimistic = result.current.messages.find(m =>
      m.id.startsWith('tmp-'),
    );
    expect(optimistic).toBeDefined();
    expect(optimistic?.status).toBe('failed');
    expect(startSpy).not.toHaveBeenCalled();

    const serverMessage = buildMessage({
      id: 'srv-retry-1',
      content: '@momo hi',
      momo_invocation_tagged: true,
    });
    sendChatMessageMock.mockResolvedValueOnce({ message: serverMessage });

    await act(async () => {
      if (!optimistic) throw new Error('missing optimistic');
      await result.current.onRetrySend(optimistic);
    });

    expect(startSpy).toHaveBeenCalledWith({
      content: '@momo hi',
      householdId: null,
      triggeringMessageId: 'srv-retry-1',
    });
  });

  it('filters pendingStreams when a persisted MoMo reply with matching idempotency_key is in messages', () => {
    const triggeringMessage = buildMessage({
      id: 'trigger-x',
      content: '@momo q',
      momo_invocation_tagged: true,
    });
    const persistedMomoReply = buildMessage({
      id: 'momo-reply-x',
      content: 'answer',
      author_kind: 'momo',
      momo_source: 'momo_agent',
      idempotency_key: 'momo:trigger-x',
      created_at: '2026-05-14T00:00:01.000Z',
    });

    streamsValue = new Map([
      ['trigger-x', { status: 'done', text: 'answer', error: null }],
    ]);

    const { result } = renderPanel([triggeringMessage, persistedMomoReply]);

    expect(result.current.pendingStreams.has('trigger-x')).toBe(false);
  });

  it('keeps pendingStreams when no persisted MoMo reply has landed yet', () => {
    const triggeringMessage = buildMessage({
      id: 'trigger-y',
      content: '@momo q',
      momo_invocation_tagged: true,
    });

    streamsValue = new Map([
      ['trigger-y', { status: 'streaming', text: 'work…', error: null }],
    ]);

    const { result } = renderPanel([triggeringMessage]);

    expect(result.current.pendingStreams.get('trigger-y')).toMatchObject({
      status: 'streaming',
    });
  });
});
