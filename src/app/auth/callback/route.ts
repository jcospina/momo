// app/auth/callback/route.ts
import { fetchHouseholdMembership } from '@helpers/households';
import { createSupabaseServerClient } from '@supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/?error=auth', url.origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL('/?error=auth', url.origin));
  }

  const membership = await fetchHouseholdMembership(supabase, user.id);
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get('invite_token');

  const destination = membership
    ? '/home'
    : inviteToken
      ? '/invite/accept'
      : '/onboarding';

  return NextResponse.redirect(new URL(destination, url.origin));
}
