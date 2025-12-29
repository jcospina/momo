import { act, renderHook, waitFor } from '@testing-library/react';

import type { ChatMessage } from '@lib-types/chat-messages';
import { useHouseholdRealtime } from './use-household-realtime';

type FakeChannel = {
  on: jest.MockedFunction<
    (
      event: string,
      filter: Record<string, string>,
      handler: (payload: { eventType: string; new: ChatMessage }) => void,
    ) => FakeChannel
  >;
  subscribe: jest.MockedFunction<
    (callback: (status: string) => void) => FakeChannel
  >;
  unsubscribe: jest.MockedFunction<() => void>;
  triggerStatus: (status: string) => void;
  triggerInsert: (message: ChatMessage) => void;
};

type FakeClient = {
  realtime: { setAuth: jest.MockedFunction<() => Promise<void>> };
  removeAllChannels: jest.MockedFunction<() => void>;
  removeChannel: jest.MockedFunction<(ch: FakeChannel) => void>;
  channel: jest.MockedFunction<(topic: string) => FakeChannel>;
  channelInstance: FakeChannel;
};

const createdClients: FakeClient[] = [];

function makeFakeChannel(): FakeChannel {
  let statusCb: ((status: string) => void) | null = null;
  let payloadCb:
    | ((payload: { eventType: string; new: ChatMessage }) => void)
    | null = null;

  const channel: FakeChannel = {
    on: jest.fn<FakeChannel, Parameters<FakeChannel['on']>>(
      (_event, _filter, handler) => {
        payloadCb = handler;
        return channel;
      },
    ),
    subscribe: jest.fn<FakeChannel, Parameters<FakeChannel['subscribe']>>(
      cb => {
        statusCb = cb;
        return channel;
      },
    ),
    unsubscribe: jest.fn<ReturnType<FakeChannel['unsubscribe']>, []>(() => {}),
    triggerStatus: status => {
      statusCb?.(status);
    },
    triggerInsert: message => {
      payloadCb?.({
        eventType: 'INSERT',
        new: message,
      });
    },
  };

  return channel;
}

const mockCreateClient = jest.fn(
  (_url?: string, _key?: string, _opts?: unknown) => {
    const channelInstance = makeFakeChannel();
    const channelMock = jest.fn<FakeChannel, [string]>(
      () => channelInstance,
    ) as jest.MockedFunction<(topic: string) => FakeChannel>;
    const client: FakeClient = {
      realtime: {
        setAuth: jest.fn().mockResolvedValue(undefined),
      },
      removeAllChannels: jest.fn(),
      removeChannel: jest.fn(),
      channel: channelMock,
      channelInstance,
    };
    createdClients.push(client);
    return client;
  },
);

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: Parameters<typeof mockCreateClient>) =>
    mockCreateClient(...args),
}));

describe('useHouseholdRealtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    createdClients.length = 0;
    mockCreateClient.mockClear();
    const fakeResponse: Response = {
      ok: true,
      json: async () => ({ access_token: 'token', expires_in: 3600 }),
    } as Response;
    const mockFetch = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >(async () => fakeResponse);
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('rebuilds client on error/closed and delivers messages after resubscribe', async () => {
    const onMessage = jest.fn();
    const onStatus = jest.fn();

    renderHook(() =>
      useHouseholdRealtime({
        householdId: 'hid',
        isHousehold: true,
        onMessage,
        onStatus,
      }),
    );

    // wait for initial client creation and subscription
    await waitFor(() => expect(createdClients.length).toBeGreaterThan(0));
    const first = createdClients[0].channelInstance;

    act(() => {
      first.triggerStatus('SUBSCRIBED');
    });
    act(() => {
      first.triggerInsert({
        id: 'm1',
        household_id: 'hid',
        user_id: 'u1',
        content: 'hi',
        status: 'processed',
        created_at: new Date().toISOString(),
        sender_name: null,
      });
    });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
    );

    // Simulate channel error -> closed -> resubscribe (with backoff)
    act(() => {
      first.triggerStatus('CHANNEL_ERROR');
      first.triggerStatus('CLOSED');
    });
    // advance backoff timer (1s then 2s capped)
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => expect(createdClients.length).toBe(2));
    const second = createdClients[1].channelInstance;

    act(() => {
      second.triggerStatus('SUBSCRIBED');
    });
    act(() => {
      second.triggerInsert({
        id: 'm2',
        household_id: 'hid',
        user_id: 'u2',
        content: 'after',
        status: 'processed',
        created_at: new Date().toISOString(),
        sender_name: null,
      });
    });

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2' }),
    );
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED');
    expect(createdClients[0].removeAllChannels).toHaveBeenCalled();
  });
});
