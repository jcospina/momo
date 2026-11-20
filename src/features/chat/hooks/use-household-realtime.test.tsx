import type { ChatMessage } from '@lib-types/chat';
import { RealtimeClientProvider } from '@providers/realtime-client-provider';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useHouseholdRealtime } from './use-household-realtime';

type FakeChannel = {
  on: jest.MockedFunction<
    (
      event: string,
      filter: Record<string, string>,
      handler: (payload: {
        eventType: string;
        new?: ChatMessage;
        old?: ChatMessage;
      }) => void,
    ) => FakeChannel
  >;
  subscribe: jest.MockedFunction<
    (callback: (status: string) => void) => FakeChannel
  >;
  unsubscribe: jest.MockedFunction<() => void>;
  triggerStatus: (status: string) => void;
  triggerInsert: (message: ChatMessage) => void;
  triggerDelete: (message: ChatMessage) => void;
};

type FakeClient = {
  setAuth: jest.MockedFunction<() => Promise<void>>;
  removeAllChannels: jest.MockedFunction<() => void>;
  removeChannel: jest.MockedFunction<(ch: FakeChannel) => void>;
  channel: jest.MockedFunction<(topic: string) => FakeChannel>;
  channelInstance: FakeChannel;
};

const createdClients: FakeClient[] = [];

function makeFakeChannel(): FakeChannel {
  let statusCb: ((status: string) => void) | null = null;
  let payloadCb:
    | ((payload: {
        eventType: string;
        new?: ChatMessage;
        old?: ChatMessage;
      }) => void)
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
    unsubscribe: jest.fn<ReturnType<FakeChannel['unsubscribe']>, []>(() => {
      // noop fake channel unsubscribe
    }),
    triggerStatus: status => {
      statusCb?.(status);
    },
    triggerInsert: message => {
      payloadCb?.({
        eventType: 'INSERT',
        new: message,
      });
    },
    triggerDelete: message => {
      payloadCb?.({
        eventType: 'DELETE',
        old: message,
      });
    },
  };

  return channel;
}

function createFakeClient(): FakeClient {
  const channelInstance = makeFakeChannel();
  const channelMock = jest.fn<FakeChannel, [string]>(
    () => channelInstance,
  ) as jest.MockedFunction<(topic: string) => FakeChannel>;
  const client: FakeClient = {
    setAuth: jest.fn().mockResolvedValue(undefined),
    removeAllChannels: jest.fn(),
    removeChannel: jest.fn(),
    channel: channelMock,
    channelInstance,
  };
  createdClients.push(client);
  return client;
}

const mockCreateClient = jest.fn<
  FakeClient,
  [url?: string, key?: string, opts?: unknown]
>();

jest.mock('@supabase/supabase-js', () => ({
  // Called with `new`; returning an object makes that the instance. A plain
  // function (not jest.fn) so afterEach's resetAllMocks() keeps it.
  RealtimeClient: function RealtimeClient(
    ...args: Parameters<typeof mockCreateClient>
  ) {
    return mockCreateClient(...args);
  },
}));

describe('useHouseholdRealtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    createdClients.length = 0;
    mockCreateClient.mockClear();
    // afterEach's resetAllMocks() drops implementations, so reinstall it.
    mockCreateClient.mockImplementation(createFakeClient);
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

    renderHook(
      () =>
        useHouseholdRealtime({
          householdId: 'hid',
          isHousehold: true,
          onMessage,
          onStatus,
        }),
      {
        wrapper({ children }) {
          return <RealtimeClientProvider>{children}</RealtimeClientProvider>;
        },
      },
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
        expense_count: 0,
        created_at: new Date().toISOString(),
        sender_name: null,
        author_kind: 'user',
        momo_source: null,
        momo_invocation_tagged: false,
        idempotency_key: null,
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
        expense_count: 0,
        created_at: new Date().toISOString(),
        sender_name: null,
        author_kind: 'user',
        momo_source: null,
        momo_invocation_tagged: false,
        idempotency_key: null,
      });
    });

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2' }),
    );
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED');
    expect(createdClients[0].removeAllChannels).toHaveBeenCalled();
  });

  it('resubscribes on the shared client every time the panel is reactivated', async () => {
    const onMessage = jest.fn();

    const { rerender } = renderHook(
      ({ isHousehold }: { isHousehold: boolean }) =>
        useHouseholdRealtime({
          householdId: 'hid',
          isHousehold,
          onMessage,
        }),
      {
        initialProps: { isHousehold: true },
        wrapper({ children }) {
          return <RealtimeClientProvider>{children}</RealtimeClientProvider>;
        },
      },
    );

    await waitFor(() => expect(createdClients.length).toBe(1));
    const client = createdClients[0];
    const channel = client.channelInstance;
    expect(channel.subscribe).toHaveBeenCalledTimes(1);

    // Household -> personal -> household, several times (ChatToggle).
    for (let toggle = 1; toggle <= 3; toggle += 1) {
      rerender({ isHousehold: false });
      expect(client.removeChannel).toHaveBeenCalledTimes(toggle);

      rerender({ isHousehold: true });
      expect(client.channel).toHaveBeenLastCalledWith('chat:household:hid');
      expect(channel.subscribe).toHaveBeenCalledTimes(toggle + 1);
    }

    // Same shared client throughout: deactivation only drops the channel.
    expect(createdClients).toHaveLength(1);
    expect(client.removeAllChannels).not.toHaveBeenCalled();

    act(() => {
      channel.triggerStatus('SUBSCRIBED');
    });
    act(() => {
      channel.triggerInsert({
        id: 'm-after-toggles',
        household_id: 'hid',
        user_id: 'u2',
        content: 'after toggles',
        status: 'pending',
        expense_count: 0,
        created_at: new Date().toISOString(),
        sender_name: null,
        author_kind: 'user',
        momo_source: null,
        momo_invocation_tagged: false,
        idempotency_key: null,
      });
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-after-toggles' }),
    );
  });
});
