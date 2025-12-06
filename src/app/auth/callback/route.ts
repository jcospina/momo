// app/auth/callback/route.ts
import { fetchHouseholdMembership } from '@helpers/households';
import { createUserProfile } from '@helpers/profiles';
import { createSupabaseServerClient } from '@supabase/server';
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

  const profile = await createUserProfile(user);

  if (!profile) {
    return NextResponse.redirect(new URL('/?error=auth', url.origin));
  }

  const membership = await fetchHouseholdMembership(supabase, user.id);

  const destination = membership ? '/home' : '/onboarding';

  return NextResponse.redirect(new URL(destination, url.origin));
}
