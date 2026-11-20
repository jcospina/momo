import type { CookieOptionsWithName } from '@supabase/ssr';

// Supabase auth cookies hold the access and refresh tokens. Only server code
// reads them (the browser realtime client gets its token from
// /api/realtime-token), so they are httpOnly: injected script cannot read the
// long-lived refresh token. @supabase/ssr applies these options to every auth
// cookie it sets or clears, including the OAuth PKCE code verifier.
export const SUPABASE_AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};
