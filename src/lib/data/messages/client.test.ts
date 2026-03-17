import {
  deleteChatMessage as deleteChatMessageAction,
  sendChatMessage as sendChatMessageAction,
} from '@actions/chat-messages';
import {
  subscribeToHouseholdChat as subscribeToHouseholdChatHelper,
  subscribeToPersonalChat as subscribeToPersonalChatHelper,
} from '@helpers/chat/chat-realtime';
import type { ChatMessage } from '@lib-types/chat';

import { getList, getSince, remove, send, subscribe } from './client';

jest.mock('@actions/chat-messages', () => ({
  sendChatMessage: jest.fn(),
  deleteChatMessage: jest.fn(),
}));

jest.mock('@helpers/chat/chat-realtime', () => ({
  subscribeToPersonalChat: jest.fn(),
  subscribeToHouseholdChat: jest.fn(),
}));

function makeResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('data/messages/client facade', () => {
  const sendChatMessageMock = jest.mocked(sendChatMessageAction);
  const deleteChatMessageMock = jest.mocked(deleteChatMessageAction);
  const subscribeToPersonalChatMock = jest.mocked(
    subscribeToPersonalChatHelper,
  );
  const subscribeToHouseholdChatMock = jest.mocked(
    subscribeToHouseholdChatHelper,
  );

  const message: ChatMessage = {
    id: 'm1',
    household_id: null,
    user_id: 'user-1',
    content: 'hello',
    status: 'processed',
    expense_count: 0,
    created_at: '2026-03-17T00:00:00.000Z',
    sender_name: 'User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads chat history via /api/chat-history', async () => {
    const fetchMock = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >(async () => makeResponse({ messages: [message] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getList({
      householdId: null,
      cursor: { created_at: '2026-03-17T00:00:00.000Z', id: 'm0' },
      limit: 30,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat-history',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result).toEqual([message]);
  });

  it('reads incremental sync via /api/chat-sync', async () => {
    const fetchMock = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >(async () => makeResponse({ messages: [message] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getSince({
      householdId: 'house-1',
      cursor: { created_at: '2026-03-17T00:00:00.000Z', id: 'm0' },
      limit: 100,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat-sync',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result).toEqual([message]);
  });

  it('delegates send and delete mutations', async () => {
    sendChatMessageMock.mockResolvedValue({ message });
    deleteChatMessageMock.mockResolvedValue({ messageId: message.id });

    const sendResult = await send({ content: 'hello', householdId: null });
    const deleteResult = await remove({ messageId: message.id });

    expect(sendChatMessageMock).toHaveBeenCalledWith({
      content: 'hello',
      householdId: null,
    });
    expect(deleteChatMessageMock).toHaveBeenCalledWith({
      messageId: message.id,
    });
    expect(sendResult).toEqual({ message });
    expect(deleteResult).toEqual({ messageId: message.id });
  });

  it('delegates realtime subscription by scope', () => {
    const personalChannel = { topic: 'personal' } as never;
    const householdChannel = { topic: 'household' } as never;
    const onChange = jest.fn();
    const onStatus = jest.fn();
    const client = {} as never;

    subscribeToPersonalChatMock.mockReturnValue(personalChannel);
    subscribeToHouseholdChatMock.mockReturnValue(householdChannel);

    const personalResult = subscribe({
      scope: 'personal',
      userId: 'user-1',
      client,
      onChange,
      onStatus,
    });
    const householdResult = subscribe({
      scope: 'household',
      householdId: 'house-1',
      client,
      onChange,
      onStatus,
    });

    expect(subscribeToPersonalChatMock).toHaveBeenCalledWith(
      'user-1',
      client,
      onChange,
      onStatus,
    );
    expect(subscribeToHouseholdChatMock).toHaveBeenCalledWith(
      'house-1',
      client,
      onChange,
      onStatus,
    );
    expect(personalResult).toBe(personalChannel);
    expect(householdResult).toBe(householdChannel);
  });
});
