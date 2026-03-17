import {
  deleteChatMessage as deleteChatMessageAction,
  sendChatMessage as sendChatMessageAction,
} from '@actions/chat-messages';
import {
  fetchChatHistory as fetchChatHistoryHelper,
  fetchChatMessages as fetchChatMessagesHelper,
  fetchChatMessagesSince as fetchChatMessagesSinceHelper,
} from '@helpers/chat/chat-messages';

import { getHistory, getList, getSince, remove, send } from './server';

jest.mock('@actions/chat-messages', () => ({
  sendChatMessage: jest.fn(),
  deleteChatMessage: jest.fn(),
}));

jest.mock('@helpers/chat/chat-messages', () => ({
  fetchChatMessages: jest.fn(),
  fetchChatHistory: jest.fn(),
  fetchChatMessagesSince: jest.fn(),
}));

describe('data/messages/server facade', () => {
  const fetchChatMessagesMock = jest.mocked(fetchChatMessagesHelper);
  const fetchChatHistoryMock = jest.mocked(fetchChatHistoryHelper);
  const fetchChatMessagesSinceMock = jest.mocked(fetchChatMessagesSinceHelper);
  const sendChatMessageMock = jest.mocked(sendChatMessageAction);
  const deleteChatMessageMock = jest.mocked(deleteChatMessageAction);

  const sample = [
    {
      id: 'm1',
      household_id: null,
      user_id: 'user-1',
      content: 'hello',
      status: 'processed' as const,
      expense_count: 0,
      created_at: '2026-03-17T00:00:00.000Z',
      sender_name: 'User',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates latest message list reads', async () => {
    const supabase = { marker: 'server' } as never;
    fetchChatMessagesMock.mockResolvedValue(sample);

    const result = await getList({
      householdId: null,
      userId: 'user-1',
      limit: 30,
      options: { supabase },
    });

    expect(fetchChatMessagesMock).toHaveBeenCalledWith({
      supabase,
      householdId: null,
      userId: 'user-1',
      limit: 30,
    });
    expect(result).toEqual(sample);
  });

  it('delegates history reads with cursor', async () => {
    const supabase = { marker: 'server' } as never;
    fetchChatHistoryMock.mockResolvedValue(sample);

    const result = await getHistory({
      householdId: 'house-1',
      userId: 'user-1',
      cursor: { created_at: '2026-03-17T00:00:00.000Z', id: 'm0' },
      limit: 25,
      options: { supabase },
    });

    expect(fetchChatHistoryMock).toHaveBeenCalledWith({
      supabase,
      householdId: 'house-1',
      userId: 'user-1',
      limit: 25,
      before: { created_at: '2026-03-17T00:00:00.000Z', id: 'm0' },
    });
    expect(result).toEqual(sample);
  });

  it('delegates incremental sync reads', async () => {
    const supabase = { marker: 'server' } as never;
    fetchChatMessagesSinceMock.mockResolvedValue(sample);

    const result = await getSince({
      householdId: 'house-1',
      userId: 'user-1',
      cursor: { created_at: '2026-03-17T00:00:00.000Z', id: 'm0' },
      limit: 100,
      options: { supabase },
    });

    expect(fetchChatMessagesSinceMock).toHaveBeenCalledWith({
      supabase,
      householdId: 'house-1',
      userId: 'user-1',
      limit: 100,
      cursor: { created_at: '2026-03-17T00:00:00.000Z', id: 'm0' },
    });
    expect(result).toEqual(sample);
  });

  it('delegates message send mutations', async () => {
    const actionResult = {
      message: sample[0],
    };
    sendChatMessageMock.mockResolvedValue(actionResult);

    const result = await send({ content: 'hello', householdId: null });

    expect(sendChatMessageMock).toHaveBeenCalledWith({
      content: 'hello',
      householdId: null,
    });
    expect(result).toEqual(actionResult);
  });

  it('delegates message delete mutations', async () => {
    const actionResult = { messageId: 'm1' };
    deleteChatMessageMock.mockResolvedValue(actionResult);

    const result = await remove({ messageId: 'm1' });

    expect(deleteChatMessageMock).toHaveBeenCalledWith({ messageId: 'm1' });
    expect(result).toEqual(actionResult);
  });
});
