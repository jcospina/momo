/**
 * @jest-environment node
 */

import { sendMomoMessage } from '@actions/chat-messages';
import { getUserPreferences } from '@helpers/user-prefs';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { streamAgent } from '@/agent/agent-core';
import { POST } from './route';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@actions/chat-messages', () => ({
  sendMomoMessage: jest.fn(),
}));

jest.mock('@/agent/agent-core', () => ({
  streamAgent: jest.fn(),
}));

jest.mock('@helpers/user-prefs', () => ({
  getUserPreferences: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => (id: string) => ({ __modelId: id })),
}));

type SupabaseAuthState = {
  user?: { id: string } | null;
  session?: { access_token: string } | null;
};

function mockSupabase({ user, session }: SupabaseAuthState) {
  return {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: user ?? null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: session ?? null }, error: null }),
    },
  };
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/momo-stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/momo-stream', () => {
  const createSupabaseServerClientMock = jest.mocked(
    createSupabaseServerClient,
  );
  const sendMomoMessageMock = jest.mocked(sendMomoMessage);
  const streamAgentMock = jest.mocked(streamAgent);
  const getUserPreferencesMock = jest.mocked(getUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when there is no authenticated user', async () => {
    const supabase = mockSupabase({ user: null });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);

    const response = await POST(
      makeRequest({
        content: '@momo how much did I spend?',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      }),
    );

    expect(response.status).toBe(401);
    expect(streamAgentMock).not.toHaveBeenCalled();
    expect(sendMomoMessageMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the user is present but there is no session access token', async () => {
    const supabase = mockSupabase({
      user: { id: 'user-1' },
      session: null,
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);

    const response = await POST(
      makeRequest({
        content: '@momo hi',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      }),
    );

    expect(response.status).toBe(401);
    expect(streamAgentMock).not.toHaveBeenCalled();
  });

  it('streams the agent response and persists it via sendMomoMessage onFinish', async () => {
    const supabase = mockSupabase({
      user: { id: 'user-1' },
      session: { access_token: 'access-token-123' },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    getUserPreferencesMock.mockResolvedValue({
      onboarding_status: 'completed',
      currency: 'EUR',
    });

    const streamResponse = new Response('hello from momo', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
    streamAgentMock.mockImplementation(({ onFinish }) => {
      // Simulate the AI SDK calling onFinish once the stream completes.
      // The real SDK passes a richer payload; the route only reads `text`.
      Promise.resolve().then(() =>
        onFinish?.({ text: 'hello from momo' } as never),
      );
      return {
        toTextStreamResponse: () => streamResponse,
      } as never;
    });
    sendMomoMessageMock.mockResolvedValue({
      message: {
        id: 'momo-1',
        household_id: null,
        user_id: 'user-1',
        content: 'hello from momo',
        status: 'processed',
        expense_count: 0,
        created_at: '2026-05-13T00:00:00.000Z',
        sender_name: null,
        author_kind: 'momo',
        momo_source: 'momo_agent',
        momo_invocation_tagged: false,
        idempotency_key: 'momo:trigger-1',
      },
      reused: false,
    });

    const response = await POST(
      makeRequest({
        content: '@momo how much did I spend on coffee?',
        householdId: 'house-1',
        triggeringMessageId: 'trigger-42',
      }),
    );

    expect(response).toBe(streamResponse);

    // Wait for the onFinish microtask scheduled inside the mock.
    await new Promise(resolve => setImmediate(resolve));

    expect(streamAgentMock).toHaveBeenCalledTimes(1);
    const streamArgs = streamAgentMock.mock.calls[0][0];
    expect(streamArgs.messages).toEqual([
      { role: 'user', content: '@momo how much did I spend on coffee?' },
    ]);
    expect(streamArgs.context).toEqual({
      currency: 'EUR',
      auth: {
        userId: 'user-1',
        accessToken: 'access-token-123',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
    });

    expect(sendMomoMessageMock).toHaveBeenCalledWith({
      content: 'hello from momo',
      householdId: 'house-1',
      userId: 'user-1',
      triggeringMessageId: 'trigger-42',
    });
  });

  it('logs but does not throw when sendMomoMessage returns an errorCode', async () => {
    const supabase = mockSupabase({
      user: { id: 'user-1' },
      session: { access_token: 'access-token-123' },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    getUserPreferencesMock.mockResolvedValue(null);

    let capturedOnFinish:
      | ((event: { text: string }) => Promise<void> | void)
      | undefined;
    streamAgentMock.mockImplementation(({ onFinish }) => {
      capturedOnFinish = onFinish as never;
      return {
        toTextStreamResponse: () => new Response('partial reply'),
      } as never;
    });
    sendMomoMessageMock.mockResolvedValue({
      errorCode: 'momo_message_send_failed',
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // silence expected error log for this test
      });

    const response = await POST(
      makeRequest({
        content: '@momo total spend?',
        householdId: null,
        triggeringMessageId: 'trigger-9',
      }),
    );

    expect(response.status).toBe(200);

    // Drive onFinish manually so we can assert the route's failure handling.
    expect(capturedOnFinish).toBeDefined();
    await expect(
      Promise.resolve(capturedOnFinish?.({ text: 'partial reply' })),
    ).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[momo-stream] persistence failed',
      expect.objectContaining({
        errorCode: 'momo_message_send_failed',
        triggeringMessageId: 'trigger-9',
      }),
    );

    consoleErrorSpy.mockRestore();
  });

  it('forwards the user content verbatim (does not strip the @momo token)', async () => {
    const supabase = mockSupabase({
      user: { id: 'user-1' },
      session: { access_token: 'access-token-123' },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    getUserPreferencesMock.mockResolvedValue(null);
    streamAgentMock.mockReturnValue({
      toTextStreamResponse: () => new Response('ok'),
    } as never);

    await POST(
      makeRequest({
        content: '@momo what did I spend on groceries last week?',
        householdId: null,
        triggeringMessageId: 'trigger-1',
      }),
    );

    expect(streamAgentMock).toHaveBeenCalledTimes(1);
    const args = streamAgentMock.mock.calls[0][0];
    expect(args.messages[0]).toEqual({
      role: 'user',
      content: '@momo what did I spend on groceries last week?',
    });
  });
});
