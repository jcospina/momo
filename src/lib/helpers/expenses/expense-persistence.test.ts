import type { ChatMessage } from '@lib-types/chat';
import type { ParsedEntry } from '@lib-types/expenses';
import { persistParsedExpenses } from './expense-persistence';

const mockCreateSupabaseServerClient = jest.fn();

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
}));

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    household_id: 'house-1',
    user_id: 'user-1',
    content: 'uber 20',
    status: 'pending',
    expense_count: 0,
    created_at: new Date().toISOString(),
    sender_name: 'User',
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    ...overrides,
  };
}

function buildEntry(overrides: Partial<ParsedEntry> = {}): ParsedEntry {
  return {
    raw: 'uber 20',
    normalized: 'uber 20',
    amount_minor: 2000,
    multiplier: 1,
    currency: 'USD',
    tags: ['uber'],
    category: 'transportation',
    ...overrides,
  };
}

describe('persistParsedExpenses', () => {
  const expensesQuery = {
    insert: jest.fn(),
    select: jest.fn(),
  };
  const chatQuery = {
    update: jest.fn(),
    eq: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    expensesQuery.insert.mockReturnValue(expensesQuery);
    chatQuery.update.mockReturnValue(chatQuery);
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'expenses') return expensesQuery;
        if (table === 'chat_messages') return chatQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
  });

  it('inserts a single expense and updates chat status', async () => {
    expensesQuery.select.mockResolvedValue({ data: [{ id: 'exp-1' }] });
    chatQuery.eq.mockResolvedValue({ error: null });
    const message = buildMessage();
    const entry = buildEntry();

    const result = await persistParsedExpenses(message, [entry]);

    expect(expensesQuery.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          chat_message_id: message.id,
          user_id: message.user_id,
          household_id: message.household_id,
          amount_cents: entry.amount_minor,
          currency: entry.currency,
          note: entry.raw,
          tags: entry.tags,
          category: entry.category,
        }),
      ]),
    );
    expect(chatQuery.update).toHaveBeenCalledWith({
      status: 'processed',
      expense_count: 1,
    });
    expect(result?.expenseIds).toEqual(['exp-1']);
  });

  it('inserts multiple expenses linked to the message', async () => {
    expensesQuery.select.mockResolvedValue({
      data: [{ id: 'exp-1' }, { id: 'exp-2' }],
    });
    chatQuery.eq.mockResolvedValue({ error: null });
    const message = buildMessage();
    const entries = [
      buildEntry(),
      buildEntry({ raw: 'taxi 10', amount_minor: 1000, tags: ['taxi'] }),
    ];

    const result = await persistParsedExpenses(message, entries);

    const insertArgs = expensesQuery.insert.mock.calls[0]?.[0] as Array<{
      chat_message_id: string;
    }>;
    expect(insertArgs).toHaveLength(2);
    insertArgs.forEach(row => {
      expect(row.chat_message_id).toBe(message.id);
    });
    expect(chatQuery.update).toHaveBeenCalledWith({
      status: 'processed',
      expense_count: 2,
    });
    expect(result?.expenseIds).toEqual(['exp-1', 'exp-2']);
  });

  it('uses a status override when provided', async () => {
    expensesQuery.select.mockResolvedValue({ data: [{ id: 'exp-1' }] });
    chatQuery.eq.mockResolvedValue({ error: null });
    const message = buildMessage();
    const entry = buildEntry({ category: null });

    const result = await persistParsedExpenses(
      message,
      [entry],
      'needs_category',
    );

    expect(chatQuery.update).toHaveBeenCalledWith({
      status: 'needs_category',
      expense_count: 1,
    });
    expect(result?.expenseIds).toEqual(['exp-1']);
  });

  it('marks the message failed when insert fails', async () => {
    expensesQuery.select.mockResolvedValue({
      data: null,
      error: new Error('insert failed'),
    });
    chatQuery.eq.mockResolvedValue({ error: null });
    const message = buildMessage();
    const entry = buildEntry();

    const result = await persistParsedExpenses(message, [entry]);

    expect(chatQuery.update).toHaveBeenCalledWith({ status: 'failed' });
    expect(result).toBeNull();
  });

  it('marks the message failed when status update fails', async () => {
    expensesQuery.select.mockResolvedValue({ data: [{ id: 'exp-1' }] });
    chatQuery.eq
      .mockResolvedValueOnce({ error: new Error('update failed') })
      .mockResolvedValueOnce({ error: null });
    const message = buildMessage();
    const entry = buildEntry();

    const result = await persistParsedExpenses(message, [entry]);

    expect(chatQuery.update).toHaveBeenNthCalledWith(1, {
      status: 'processed',
      expense_count: 1,
    });
    expect(chatQuery.update).toHaveBeenNthCalledWith(2, { status: 'failed' });
    expect(result).toBeNull();
  });
});
