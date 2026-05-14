import { createSupabaseServerClient } from '@lib-supabase/server';
import { sendMomoMessage } from './chat-messages';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@helpers/chat/chat-messages', () => ({
  deleteChatMessage: jest.fn(),
}));

jest.mock('@helpers/chat/chat-processor', () => ({
  processChatMessage: jest.fn(),
}));

type InsertResult = {
  data: Record<string, unknown> | null;
  error: { code?: string; message?: string } | null;
};

type IdempotentReadResult = {
  data: Record<string, unknown> | null;
  error: { message?: string } | null;
};

function createSupabaseMock(opts: {
  user?: { id: string } | null;
  insert?: InsertResult;
  idempotentRead?: IdempotentReadResult;
}) {
  const insertResult: InsertResult = opts.insert ?? {
    data: null,
    error: null,
  };
  const idempotentResult: IdempotentReadResult = opts.idempotentRead ?? {
    data: null,
    error: null,
  };

  const insertCalls: unknown[] = [];

  const insertBuilder = {
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue(insertResult),
    }),
  };

  const idempotentReadBuilder = {
    single: jest.fn().mockResolvedValue(idempotentResult),
  };

  const selectBuilder = {
    eq: jest.fn().mockReturnValue(idempotentReadBuilder),
  };

  const chatMessagesBuilder = {
    insert: jest.fn((payload: unknown) => {
      insertCalls.push(payload);
      return insertBuilder;
    }),
    select: jest.fn().mockReturnValue(selectBuilder),
  };

  const from = jest.fn((table: string) => {
    if (table === 'chat_messages') return chatMessagesBuilder;
    throw new Error(`unexpected table: ${table}`);
  });

  return {
    client: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: opts.user === undefined ? { id: 'user-1' } : opts.user,
          },
          error: null,
        }),
      },
      from,
    },
    insertCalls,
    selectBuilder,
    chatMessagesBuilder,
  };
}

describe('sendMomoMessage action', () => {
  const createSupabaseServerClientMock = jest.mocked(
    createSupabaseServerClient,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns message_empty when content is blank', async () => {
    const result = await sendMomoMessage({
      content: '   ',
      householdId: null,
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(result).toEqual({ errorCode: 'message_empty' });
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it('returns auth_required when session user is missing', async () => {
    const supabase = createSupabaseMock({ user: null });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendMomoMessage({
      content: 'hello',
      householdId: null,
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(result).toEqual({ errorCode: 'auth_required' });
  });

  it('returns auth_required when session user mismatches input userId', async () => {
    const supabase = createSupabaseMock({ user: { id: 'other-user' } });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendMomoMessage({
      content: 'hello',
      householdId: null,
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(result).toEqual({ errorCode: 'auth_required' });
  });

  it('inserts a momo row on first call with the expected payload', async () => {
    const inserted = {
      id: 'momo-1',
      household_id: null,
      user_id: 'user-1',
      content: 'Sure, here is your total.',
      status: 'processed',
      expense_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      sender_name: null,
      author_kind: 'momo',
      momo_source: 'momo_agent',
      momo_invocation_tagged: false,
    };
    const supabase = createSupabaseMock({
      insert: { data: inserted, error: null },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendMomoMessage({
      content: 'Sure, here is your total.',
      householdId: null,
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(supabase.insertCalls).toEqual([
      {
        content: 'Sure, here is your total.',
        household_id: null,
        user_id: 'user-1',
        author_kind: 'momo',
        momo_source: 'momo_agent',
        idempotency_key: 'momo:trigger-1',
        status: 'processed',
        sender_name: null,
      },
    ]);
    expect(result).toEqual({ message: inserted, reused: false });
  });

  it('returns the existing row on idempotent replay (23505 unique violation)', async () => {
    const existing = {
      id: 'momo-1',
      household_id: 'house-1',
      user_id: 'user-1',
      content: 'cached reply',
      status: 'processed',
      expense_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      sender_name: null,
      author_kind: 'momo',
      momo_source: 'momo_agent',
      momo_invocation_tagged: false,
    };
    const supabase = createSupabaseMock({
      insert: { data: null, error: { code: '23505', message: 'unique' } },
      idempotentRead: { data: existing, error: null },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendMomoMessage({
      content: 'cached reply',
      householdId: 'house-1',
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(supabase.selectBuilder.eq).toHaveBeenCalledWith(
      'idempotency_key',
      'momo:trigger-1',
    );
    expect(result).toEqual({ message: existing, reused: true });
  });

  it('returns momo_message_send_failed when the idempotent fallback read fails', async () => {
    const supabase = createSupabaseMock({
      insert: { data: null, error: { code: '23505', message: 'unique' } },
      idempotentRead: { data: null, error: { message: 'read failed' } },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendMomoMessage({
      content: 'hello',
      householdId: null,
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
  });

  it('returns momo_message_send_failed on non-unique-violation DB error', async () => {
    const supabase = createSupabaseMock({
      insert: { data: null, error: { code: '42501', message: 'forbidden' } },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendMomoMessage({
      content: 'hello',
      householdId: null,
      userId: 'user-1',
      triggeringMessageId: 'trigger-1',
    });

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
  });
});
