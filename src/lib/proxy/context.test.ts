/**
 * @jest-environment node
 */
import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { getMembership } from '@/lib/data/households/server';
import { buildProxyContext } from './context';
import { ONBOARDED_COOKIE, onboardedCookieValue } from './onboarded-cookie';
import { proxyRules } from './rules';

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@/lib/data/households/server', () => ({ getMembership: jest.fn() }));

const createServerClientMock = jest.mocked(createServerClient);
const getMembershipMock = jest.mocked(getMembership);

function mockSupabase({
  userId,
  onboardingStatus = 'unknown',
}: {
  userId: string | null;
  onboardingStatus?: string;
}) {
  const prefsQuery = {
    select: () => prefsQuery,
    eq: () => prefsQuery,
    single: jest.fn().mockResolvedValue({
      data: { onboarding_status: onboardingStatus },
      error: null,
    }),
  };
  const supabase = {
    auth: {
      getClaims: jest.fn().mockResolvedValue({
        data: userId ? { claims: { sub: userId } } : null,
        error: null,
      }),
    },
    from: jest.fn(() => prefsQuery),
  };
  createServerClientMock.mockReturnValue(supabase as never);
  return { supabase, prefsQuery };
}

function request(path: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(`http://localhost${path}`);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

async function runRules(req: NextRequest) {
  const ctx = await buildProxyContext(req);
  for (const rule of proxyRules) {
    const response = rule(ctx);
    if (response) return { ctx, response };
  }
  return { ctx, response: ctx.next() };
}

describe('buildProxyContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks nothing up for visitors without a session', async () => {
    const { supabase } = mockSupabase({ userId: null });

    const { ctx, response } = await runRules(request('/home'));

    expect(ctx.user).toBeNull();
    expect(getMembershipMock).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('skips the gate lookups on routes no rule gates', async () => {
    const { supabase } = mockSupabase({ userId: 'user-1' });

    await runRules(request('/privacy'));

    expect(getMembershipMock).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('sends a user who never onboarded and has no household to /onboarding', async () => {
    mockSupabase({ userId: 'user-1', onboardingStatus: 'unknown' });
    getMembershipMock.mockResolvedValue(null);

    const { response } = await runRules(request('/home'));

    expect(response.headers.get('location')).toBe(
      'http://localhost/onboarding',
    );
    expect(response.cookies.get(ONBOARDED_COOKIE)).toBeUndefined();
  });

  it('remembers a finished onboarding when it lets someone into /home', async () => {
    mockSupabase({ userId: 'user-1', onboardingStatus: 'completed' });
    getMembershipMock.mockResolvedValue({ household_id: 'house-1' });

    const { response } = await runRules(request('/home/stats'));

    expect(response.headers.get('location')).toBeNull();
    expect(response.cookies.get(ONBOARDED_COOKIE)?.value).toBe(
      onboardedCookieValue('user-1', 'completed'),
    );
  });

  it('lets a remembered user into /home without any lookup', async () => {
    const { supabase } = mockSupabase({ userId: 'user-1' });

    const { ctx, response } = await runRules(
      request('/home', {
        [ONBOARDED_COOKIE]: onboardedCookieValue('user-1', 'skipped'),
      }),
    );

    expect(ctx.onboardingStatus).toBe('skipped');
    expect(getMembershipMock).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBeNull();
  });

  it("ignores another user's remembered status", async () => {
    mockSupabase({ userId: 'user-2', onboardingStatus: 'unknown' });
    getMembershipMock.mockResolvedValue(null);

    const { response } = await runRules(
      request('/home', {
        [ONBOARDED_COOKIE]: onboardedCookieValue('user-1', 'completed'),
      }),
    );

    expect(getMembershipMock).toHaveBeenCalledWith('user-2', {
      supabase: expect.anything(),
    });
    expect(response.headers.get('location')).toBe(
      'http://localhost/onboarding',
    );
  });

  it('still looks up the household for / even when onboarding is remembered', async () => {
    mockSupabase({ userId: 'user-1', onboardingStatus: 'completed' });
    getMembershipMock.mockResolvedValue({ household_id: 'house-1' });

    const { response } = await runRules(
      request('/', {
        [ONBOARDED_COOKIE]: onboardedCookieValue('user-1', 'completed'),
      }),
    );

    expect(getMembershipMock).toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('http://localhost/home');
  });
});
