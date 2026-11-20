import { persistMomoReply } from './momo-replies';

type QueryResult = {
  data: Record<string, unknown> | null;
  error: { code?: string; message?: string } | null;
};

function createSessionClientMock(opts: {
  user?: { id: string } | null;
  trigger?: QueryResult;
  idempotentRead?: QueryResult;
}) {
  const triggerResult: QueryResult = opts.trigger ?? {
    data: { id: 'trigger-1', user_id: 'user-1', household_id: null },
    error: null,
  };
  const idempotentResult: QueryResult = opts.idempotentRead ?? {
    data: null,
    error: null,
  };

  const eq = jest.fn((column: string) => ({
    maybeSingle: jest.fn().mockResolvedValue(triggerResult),
    single: jest
      .fn()
      .mockResolvedValue(
        column === 'idempotency_key' ? idempotentResult : triggerResult,
      ),
  }));
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn((table: string) => {
    if (table === 'chat_messages') return { select };
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
    eq,
  };
}

function createServiceClientMock(insertResult: QueryResult) {
  const insertCalls: unknown[] = [];
  const insert = jest.fn((payload: unknown) => {
    insertCalls.push(payload);
    return {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(insertResult),
      }),
    };
  });
  const from = jest.fn((table: string) => {
    if (table === 'chat_messages') return { insert };
    throw new Error(`unexpected table: ${table}`);
  });

  return { client: { from }, insertCalls, insert };
}

function persist(
  session: ReturnType<typeof createSessionClientMock>,
  service: ReturnType<typeof createServiceClientMock>,
  overrides: Partial<{
    content: string;
    householdId: string | null;
    userId: string;
  }> = {},
) {
  return persistMomoReply({
    sessionClient: session.client as never,
    serviceClient: service.client as never,
    content: 'hello',
    householdId: null,
    userId: 'user-1',
    triggeringMessageId: 'trigger-1',
    ...overrides,
  });
}

const momoRow = {
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
  idempotency_key: 'momo:trigger-1',
};

describe('persistMomoReply', () => {
  it('returns message_empty when content is blank', async () => {
    const session = createSessionClientMock({});
    const service = createServiceClientMock({ data: null, error: null });

    const result = await persist(session, service, { content: '   ' });

    expect(result).toEqual({ errorCode: 'message_empty' });
    expect(session.client.auth.getUser).not.toHaveBeenCalled();
    expect(service.insert).not.toHaveBeenCalled();
  });

  it('returns auth_required when session user is missing', async () => {
    const session = createSessionClientMock({ user: null });
    const service = createServiceClientMock({ data: null, error: null });

    const result = await persist(session, service);

    expect(result).toEqual({ errorCode: 'auth_required' });
    expect(service.insert).not.toHaveBeenCalled();
  });

  it('returns auth_required when session user mismatches input userId', async () => {
    const session = createSessionClientMock({ user: { id: 'other-user' } });
    const service = createServiceClientMock({ data: null, error: null });

    const result = await persist(session, service);

    expect(result).toEqual({ errorCode: 'auth_required' });
    expect(service.insert).not.toHaveBeenCalled();
  });

  it('refuses when the triggering message is not visible to the caller', async () => {
    const session = createSessionClientMock({
      trigger: { data: null, error: null },
    });
    const service = createServiceClientMock({ data: null, error: null });

    const result = await persist(session, service);

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
    expect(service.insert).not.toHaveBeenCalled();
  });

  it('refuses when the triggering message belongs to another user', async () => {
    const session = createSessionClientMock({
      trigger: {
        data: { id: 'trigger-1', user_id: 'user-2', household_id: 'house-1' },
        error: null,
      },
    });
    const service = createServiceClientMock({ data: null, error: null });

    const result = await persist(session, service, { householdId: 'house-1' });

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
    expect(service.insert).not.toHaveBeenCalled();
  });

  it('refuses when the requested household differs from the trigger chat', async () => {
    const session = createSessionClientMock({
      trigger: {
        data: { id: 'trigger-1', user_id: 'user-1', household_id: null },
        error: null,
      },
    });
    const service = createServiceClientMock({ data: null, error: null });

    const result = await persist(session, service, {
      householdId: 'someone-elses-house',
    });

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
    expect(service.insert).not.toHaveBeenCalled();
  });

  it('inserts the momo row with the service client after verifying the trigger', async () => {
    const session = createSessionClientMock({});
    const service = createServiceClientMock({ data: momoRow, error: null });

    const result = await persist(session, service, {
      content: 'Sure, here is your total.',
    });

    expect(session.eq).toHaveBeenCalledWith('id', 'trigger-1');
    expect(service.insertCalls).toEqual([
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
    expect(result).toEqual({ message: momoRow, reused: false });
  });

  it('returns the existing row on idempotent replay (23505 unique violation)', async () => {
    const existing = { ...momoRow, household_id: 'house-1' };
    const session = createSessionClientMock({
      trigger: {
        data: { id: 'trigger-1', user_id: 'user-1', household_id: 'house-1' },
        error: null,
      },
      idempotentRead: { data: existing, error: null },
    });
    const service = createServiceClientMock({
      data: null,
      error: { code: '23505', message: 'unique' },
    });

    const result = await persist(session, service, { householdId: 'house-1' });

    expect(session.eq).toHaveBeenCalledWith(
      'idempotency_key',
      'momo:trigger-1',
    );
    expect(result).toEqual({ message: existing, reused: true });
  });

  it('returns momo_message_send_failed when the idempotent fallback read fails', async () => {
    const session = createSessionClientMock({
      idempotentRead: { data: null, error: { message: 'read failed' } },
    });
    const service = createServiceClientMock({
      data: null,
      error: { code: '23505', message: 'unique' },
    });

    const result = await persist(session, service);

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
  });

  it('returns momo_message_send_failed on non-unique-violation DB error', async () => {
    const session = createSessionClientMock({});
    const service = createServiceClientMock({
      data: null,
      error: { code: '42501', message: 'forbidden' },
    });

    const result = await persist(session, service);

    expect(result).toEqual({ errorCode: 'momo_message_send_failed' });
  });
});
