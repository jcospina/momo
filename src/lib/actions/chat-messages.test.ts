import { processChatMessage } from '@helpers/chat/chat-processor';
import { isAiEnabled } from '@helpers/user-prefs';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { sendChatMessage, sendMomoMessage } from './chat-messages';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@helpers/chat/chat-messages', () => ({
  deleteChatMessage: jest.fn(),
}));

jest.mock('@helpers/chat/chat-processor', () => ({
  processChatMessage: jest.fn(),
}));

jest.mock('@helpers/user-prefs', () => ({
  isAiEnabled: jest.fn(),
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

type SendChatRow = Record<string, unknown>;

function createSendChatSupabaseMock(opts: {
  user?: {
    id: string;
    email?: string;
    user_metadata?: { name?: string };
  } | null;
  insert: { data: SendChatRow | null; error: { message?: string } | null };
  refetch?: { data: SendChatRow | null; error: { message?: string } | null };
}) {
  const insertPayloads: unknown[] = [];
  const updateCalls: Array<{ payload: unknown; id: unknown }> = [];

  const insertSingle = jest.fn().mockResolvedValue(opts.insert);
  const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
  const insertFn = jest.fn((payload: unknown) => {
    insertPayloads.push(payload);
    return { select: insertSelect };
  });

  const refetchSingle = jest
    .fn()
    .mockResolvedValue(opts.refetch ?? { data: null, error: null });
  const refetchEq = jest.fn().mockReturnValue({ single: refetchSingle });
  const selectFn = jest.fn().mockReturnValue({ eq: refetchEq });

  const updateFn = jest.fn((payload: unknown) => ({
    eq: jest.fn(async (_column: string, value: unknown) => {
      updateCalls.push({ payload, id: value });
      return { data: null, error: null };
    }),
  }));

  const chatMessages = {
    insert: insertFn,
    select: selectFn,
    update: updateFn,
  };

  const from = jest.fn((table: string) => {
    if (table === 'chat_messages') return chatMessages;
    throw new Error(`unexpected table: ${table}`);
  });

  const userValue = opts.user === undefined ? { id: 'user-1' } : opts.user;

  return {
    client: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: userValue },
          error: null,
        }),
      },
      from,
    },
    insertPayloads,
    updateCalls,
    selectFn,
    refetchEq,
  };
}

describe('sendChatMessage action', () => {
  const createSupabaseServerClientMock = jest.mocked(
    createSupabaseServerClient,
  );
  const processChatMessageMock = jest.mocked(processChatMessage);
  const isAiEnabledMock = jest.mocked(isAiEnabled);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default existing tests to the AI-on path; specific tests override.
    isAiEnabledMock.mockResolvedValue(true);
  });

  it('returns message_empty when content is blank', async () => {
    const result = await sendChatMessage({ content: '   ' });

    expect(result).toEqual({ errorCode: 'message_empty' });
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(processChatMessageMock).not.toHaveBeenCalled();
  });

  it('inserts tagged row with momo_invocation_tagged=true and status=processed, skipping the expense pipeline', async () => {
    const inserted = {
      id: 'msg-1',
      household_id: null,
      user_id: 'user-1',
      content: '@momo what is my total?',
      status: 'processed',
      expense_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      sender_name: 'User',
      author_kind: 'user',
      momo_source: null,
      momo_invocation_tagged: true,
    };
    const supabase = createSendChatSupabaseMock({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        user_metadata: { name: 'User' },
      },
      insert: { data: inserted, error: null },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    const result = await sendChatMessage({
      content: '@momo what is my total?',
    });

    expect(supabase.insertPayloads).toEqual([
      {
        content: '@momo what is my total?',
        household_id: null,
        user_id: 'user-1',
        sender_name: 'User',
        momo_invocation_tagged: true,
        status: 'processed',
      },
    ]);
    expect(processChatMessageMock).not.toHaveBeenCalled();
    expect(supabase.selectFn).not.toHaveBeenCalled();
    expect(result).toEqual({ message: inserted });
  });

  it('preserves the original @momo token in stored content (no stripping)', async () => {
    const supabase = createSendChatSupabaseMock({
      insert: {
        data: {
          id: 'msg-2',
          household_id: null,
          user_id: 'user-1',
          content: 'hey @momo can you help?',
          status: 'processed',
          expense_count: 0,
          created_at: '2026-05-13T00:00:00.000Z',
          sender_name: null,
          author_kind: 'user',
          momo_source: null,
          momo_invocation_tagged: true,
        },
        error: null,
      },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);

    await sendChatMessage({ content: 'hey @momo can you help?' });

    expect(supabase.insertPayloads[0]).toMatchObject({
      content: 'hey @momo can you help?',
      momo_invocation_tagged: true,
    });
  });

  it('ignores @momo and runs the expense pipeline when AI is disabled', async () => {
    isAiEnabledMock.mockResolvedValue(false);
    const inserted = {
      id: 'msg-disabled',
      household_id: null,
      user_id: 'user-1',
      content: '@momo what is my total?',
      status: 'pending',
      expense_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      sender_name: null,
      author_kind: 'user',
      momo_source: null,
      momo_invocation_tagged: false,
    };
    const updated = { ...inserted, status: 'no_expense' };
    const supabase = createSendChatSupabaseMock({
      insert: { data: inserted, error: null },
      refetch: { data: updated, error: null },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);
    processChatMessageMock.mockResolvedValueOnce(undefined as never);

    const result = await sendChatMessage({
      content: '@momo what is my total?',
    });

    // Insert payload must NOT carry momo_invocation_tagged or processed status.
    expect(supabase.insertPayloads).toEqual([
      {
        content: '@momo what is my total?',
        household_id: null,
        user_id: 'user-1',
        sender_name: null,
      },
    ]);
    expect(processChatMessageMock).toHaveBeenCalledTimes(1);
    expect(processChatMessageMock).toHaveBeenCalledWith(inserted);
    expect(result).toEqual({ message: updated });
  });

  it('runs the expense pipeline and re-fetches when content is untagged', async () => {
    const inserted = {
      id: 'msg-3',
      household_id: null,
      user_id: 'user-1',
      content: 'groceries 20',
      status: 'pending',
      expense_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      sender_name: null,
      author_kind: 'user',
      momo_source: null,
      momo_invocation_tagged: false,
    };
    const updated = { ...inserted, status: 'processed', expense_count: 1 };
    const supabase = createSendChatSupabaseMock({
      insert: { data: inserted, error: null },
      refetch: { data: updated, error: null },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);
    processChatMessageMock.mockResolvedValueOnce(undefined as never);

    const result = await sendChatMessage({ content: 'groceries 20' });

    expect(supabase.insertPayloads).toEqual([
      {
        content: 'groceries 20',
        household_id: null,
        user_id: 'user-1',
        sender_name: null,
      },
    ]);
    expect(processChatMessageMock).toHaveBeenCalledTimes(1);
    expect(processChatMessageMock).toHaveBeenCalledWith(inserted);
    expect(supabase.selectFn).toHaveBeenCalled();
    expect(supabase.refetchEq).toHaveBeenCalledWith('id', 'msg-3');
    expect(result).toEqual({ message: updated });
  });

  it('marks the row failed and returns the inserted row when processing throws on the untagged path', async () => {
    const inserted = {
      id: 'msg-4',
      household_id: null,
      user_id: 'user-1',
      content: 'groceries 20',
      status: 'pending',
      expense_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      sender_name: null,
      author_kind: 'user',
      momo_source: null,
      momo_invocation_tagged: false,
    };
    const supabase = createSendChatSupabaseMock({
      insert: { data: inserted, error: null },
      refetch: { data: inserted, error: null },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase.client as never);
    processChatMessageMock.mockRejectedValueOnce(new Error('boom'));

    const result = await sendChatMessage({ content: 'groceries 20' });

    expect(supabase.updateCalls).toEqual([
      { payload: { status: 'failed' }, id: 'msg-4' },
    ]);
    expect(result).toEqual({ message: inserted });
  });
});
