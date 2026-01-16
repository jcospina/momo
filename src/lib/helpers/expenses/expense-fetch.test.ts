import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchExpensesByMessageId } from './expense-fetch';

describe('fetchExpensesByMessageId', () => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
  };

  const supabase = {
    from: jest.fn(() => query),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
  });

  it('returns rows for a message id', async () => {
    query.order.mockResolvedValue({
      data: [
        {
          id: 'exp-1',
          chat_message_id: 'msg-1',
          amount_cents: 2000,
        },
      ],
      error: null,
    });

    const result = await fetchExpensesByMessageId({
      supabase: supabase as unknown as SupabaseClient,
      messageId: 'msg-1',
    });

    expect(supabase.from).toHaveBeenCalledWith('expenses');
    expect(query.select).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith('chat_message_id', 'msg-1');
    expect(query.order).toHaveBeenCalledWith('created_at', {
      ascending: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('exp-1');
  });

  it('returns empty array when message id is empty', async () => {
    const result = await fetchExpensesByMessageId({
      supabase: supabase as unknown as SupabaseClient,
      messageId: '  ',
    });

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns empty array on query error', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: new Error('query failed'),
    });

    const result = await fetchExpensesByMessageId({
      supabase: supabase as unknown as SupabaseClient,
      messageId: 'msg-1',
    });

    expect(result).toEqual([]);
  });
});
