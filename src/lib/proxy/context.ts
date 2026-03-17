import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getMembership } from '@/lib/data/households/server';
import type { ProxyContext } from '@proxy/types';

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
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
      },
    },
  );

  // Validate the JWT before any other logic.
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    console.error('Proxy auth.getClaims failed', claimsError.message);
  }

  const jwtPayload = data?.claims ?? null;
  const applyCookies = (res: NextResponse) => {
    response.cookies.getAll().forEach(cookie => {
      res.cookies.set(cookie);
    });
    return res;
  };

  if (!jwtPayload) {
    return {
      request,
      pathname: request.nextUrl.pathname,
      supabase,
      user: null,
      membership: null,
      hasHousehold: false,
      onboardingStatus: 'unknown',
      redirect: (path: string) =>
        applyCookies(NextResponse.redirect(new URL(path, request.url))),
      next: () => response,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Proxy auth.getUser failed', error.message);
  }

  const membership = user ? await getMembership(user.id, { supabase }) : null;

  // fetch onboarding status from user_prefs; default to 'unknown' when missing
  let onboardingStatus: 'unknown' | 'skipped' | 'completed' = 'unknown';
  if (user) {
    try {
      const { data: pref, error: prefError } = await supabase
        .from('user_prefs')
        .select('onboarding_status')
        .eq('user_id', user.id)
        .single();

      if (!prefError && pref && pref.onboarding_status) {
        onboardingStatus = pref.onboarding_status;
      }
    } catch {
      // ignore and keep default
    }
  }

  return {
    request,
    pathname: request.nextUrl.pathname,
    supabase,
    user,
    membership,
    hasHousehold: Boolean(membership),
    onboardingStatus,
    redirect: (path: string) =>
      applyCookies(NextResponse.redirect(new URL(path, request.url))),
    next: () => response,
  };
}
