import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeClient } from './use-realtime-client';

// Uses the real realtime-js client (no mock): the bug lived in how
// realtime-js picks the token for each channel join.
describe('useRealtimeClient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const tokenResponse = {
      ok: true,
      json: async () => ({ access_token: 'user-jwt', expires_in: 3600 }),
    } as Response;
    global.fetch = jest.fn(async () => tokenResponse) as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('keeps the user token for channel joins after the first one', async () => {
    const { result, unmount } = renderHook(() => useRealtimeClient());

    await waitFor(() => expect(result.current.client).not.toBeNull());
    const realtime = result.current.client;
    expect(realtime?.accessTokenValue).toBe('user-jwt');

    // realtime-js calls setAuth() with no token after every channel join and
    // on every heartbeat. If that falls back to the anon key, every later join
    // (e.g. after switching chat tabs and back) loses its postgres_changes
    // subscription on the server.
    await realtime?.setAuth();

    expect(realtime?.accessTokenValue).toBe('user-jwt');
    unmount();
  });
});
