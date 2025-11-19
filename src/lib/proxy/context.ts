import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { fetchHouseholdMembership } from '@helpers/households';
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

  const membership = user
    ? await fetchHouseholdMembership(supabase, user.id)
    : null;

  return {
    request,
    pathname: request.nextUrl.pathname,
    supabase,
    user,
    membership,
    hasHousehold: Boolean(membership),
    redirect: (path: string) =>
      applyCookies(NextResponse.redirect(new URL(path, request.url))),
    next: () => response,
  };
}
