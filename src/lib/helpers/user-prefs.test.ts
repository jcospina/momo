import { createSupabaseServerClient } from '@lib-supabase/server';
import { isAiEnabled } from './user-prefs';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type PrefsRow = {
  onboarding_status?: string | null;
  currency?: string | null;
  ai_enabled?: boolean | null;
  language?: string | null;
} | null;

function mockSupabaseWithPrefs(opts: {
  data: PrefsRow;
  error?: { message: string } | null;
}) {
  const maybeSingle = jest
    .fn()
    .mockResolvedValue({ data: opts.data, error: opts.error ?? null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn((table: string) => {
    if (table !== 'user_prefs') {
      throw new Error(`unexpected table: ${table}`);
    }
    return { select };
  });
  return { auth: { getUser: jest.fn() }, from };
}

describe('isAiEnabled', () => {
  const createSupabaseServerClientMock = jest.mocked(
    createSupabaseServerClient,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true only when ai_enabled is explicitly true', async () => {
    const supabase = mockSupabaseWithPrefs({ data: { ai_enabled: true } });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);

    await expect(isAiEnabled('user-1')).resolves.toBe(true);
  });

  it('returns false when ai_enabled is explicitly false', async () => {
    const supabase = mockSupabaseWithPrefs({ data: { ai_enabled: false } });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);

    await expect(isAiEnabled('user-1')).resolves.toBe(false);
  });

  it('returns false when ai_enabled is undefined on the prefs row', async () => {
    const supabase = mockSupabaseWithPrefs({ data: { currency: 'USD' } });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);

    await expect(isAiEnabled('user-1')).resolves.toBe(false);
  });

  it('returns false when the prefs row is missing entirely', async () => {
    const supabase = mockSupabaseWithPrefs({ data: null });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);

    await expect(isAiEnabled('user-1')).resolves.toBe(false);
  });

  it('returns false when the prefs fetch errors out', async () => {
    const supabase = mockSupabaseWithPrefs({
      data: null,
      error: { message: 'boom' },
    });
    createSupabaseServerClientMock.mockResolvedValue(supabase as never);
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // silence expected error log for this test
      });

    await expect(isAiEnabled('user-1')).resolves.toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
