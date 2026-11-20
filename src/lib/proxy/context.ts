import { SUPABASE_AUTH_COOKIE_OPTIONS } from '@lib-supabase/cookie-options';
import type { OnboardingStatus } from '@lib-types/user-preferences';
import { HOME_PATH, ONBOARDING_PATH, ROOT_PATH } from '@proxy/constants';
import {
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_OPTIONS,
  onboardedCookieValue,
  readOnboardedCookie,
} from '@proxy/onboarded-cookie';
import type { ProxyContext } from '@proxy/types';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getMembership } from '@/lib/data/households/server';

function isHomePath(pathname: string) {
  return pathname === HOME_PATH || pathname.startsWith(`${HOME_PATH}/`);
}

// Only these routes have rules that look at the household or onboarding
// state, so only they pay for the database lookups.
function needsGateData(pathname: string) {
  return (
    pathname === ROOT_PATH ||
    isHomePath(pathname) ||
    pathname.startsWith(ONBOARDING_PATH)
  );
}

async function fetchOnboardingStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<OnboardingStatus> {
  try {
    const { data: pref, error } = await supabase
      .from('user_prefs')
      .select('onboarding_status')
      .eq('user_id', userId)
      .single();

    if (!error && pref?.onboarding_status) {
      return pref.onboarding_status;
    }
  } catch {
    // ignore and keep default
  }
  return 'unknown';
}

export async function buildProxyContext(
  request: NextRequest,
): Promise<ProxyContext> {
  // Start the response up front; supabase will mutate it through setAll when refreshing cookies.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
      cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
    },
  );

  // Validate the JWT before any other logic. getClaims verifies the token's
  // signature locally against the project's (cached) signing keys, so it
  // usually costs no network round trip; with a symmetric (HS256) key it
  // falls back to asking the Auth server, like getUser does.
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    console.error('Proxy auth.getClaims failed', claimsError.message);
  }

  const claims = data?.claims ?? null;
  const applyCookies = (res: NextResponse) => {
    response.cookies.getAll().forEach(cookie => {
      res.cookies.set(cookie);
    });
    return res;
  };
  const redirect = (path: string) =>
    applyCookies(NextResponse.redirect(new URL(path, request.url)));
  const next = () => response;
  const pathname = request.nextUrl.pathname;

  if (!claims?.sub) {
    return {
      request,
      pathname,
      supabase,
      user: null,
      membership: null,
      hasHousehold: false,
      onboardingStatus: 'unknown',
      redirect,
      next,
    };
  }

  const user = { id: claims.sub };
  const rememberedStatus = readOnboardedCookie(
    request.cookies.get(ONBOARDED_COOKIE)?.value,
    user.id,
  );

  // The /home guard only acts while onboarding is unknown, and a finished
  // status never goes back to unknown. So once we've seen it finished, /home
  // needs no lookup at all.
  if (rememberedStatus && isHomePath(pathname)) {
    return {
      request,
      pathname,
      supabase,
      user,
      membership: null,
      hasHousehold: false,
      onboardingStatus: rememberedStatus,
      redirect,
      next,
    };
  }

  // The two lookups are independent, so they share one round trip.
  const [membership, onboardingStatus] = needsGateData(pathname)
    ? await Promise.all([
        getMembership(user.id, { supabase }),
        fetchOnboardingStatus(supabase, user.id),
      ])
    : [null, 'unknown' as const];

  if (onboardingStatus !== 'unknown' && rememberedStatus !== onboardingStatus) {
    response.cookies.set(
      ONBOARDED_COOKIE,
      onboardedCookieValue(user.id, onboardingStatus),
      ONBOARDED_COOKIE_OPTIONS,
    );
  }

  return {
    request,
    pathname,
    supabase,
    user,
    membership,
    hasHousehold: Boolean(membership),
    onboardingStatus,
    redirect,
    next,
  };
}
