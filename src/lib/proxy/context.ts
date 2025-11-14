import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { fetchHouseholdMembership } from '@helpers/households';
import type { ProxyContext } from '@proxy/types';
import { createSupabaseProxyClient } from '@supabase/server';

export async function buildProxyContext(
  request: NextRequest,
): Promise<ProxyContext> {
  const supabase = createSupabaseProxyClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Proxy auth.getUser failed', error.message);
  }

  if (!user) {
    const cookieNames = request.cookies.getAll().map(cookie => cookie.name);
    console.info('Proxy did not find user, cookies present:', cookieNames);
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
      NextResponse.redirect(new URL(path, request.url)),
    next: () => NextResponse.next(),
  };
}
