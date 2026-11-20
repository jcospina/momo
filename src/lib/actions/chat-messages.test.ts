import { processChatMessage } from '@helpers/chat/chat-processor';
import { fetchExpensesByMessageId } from '@helpers/expenses/expense-fetch';
import { isAiEnabled } from '@helpers/user-prefs';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { sendChatMessage } from './chat-messages';

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

jest.mock('@helpers/expenses/expense-fetch', () => ({
  fetchExpensesByMessageId: jest.fn().mockResolvedValue([]),
}));

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
    expect(result).toEqual({ message: updated, expenses: [] });
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
    // The processed message's lines come back so the ticket renders at once.
    expect(jest.mocked(fetchExpensesByMessageId)).toHaveBeenCalledWith({
      supabase: supabase.client,
      messageId: 'msg-3',
    });
    expect(result).toEqual({ message: updated, expenses: [] });
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
    expect(result).toEqual({ message: inserted, expenses: [] });
  });
});
