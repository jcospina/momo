// app/auth/callback/route.ts
import { setOnboardingStatus } from '@actions/user-prefs';
import { fetchHouseholdMembership } from '@helpers/households';
import { fetchInviteInfo } from '@helpers/invites';
import { createUserProfile } from '@helpers/profiles';
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@supabase/server';
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

  const profile = await createUserProfile(user);

  if (!profile) {
    return NextResponse.redirect(new URL('/?error=auth', url.origin));
  }

  const cookieStore = await cookies();
  const inviteToken = cookieStore.get('invite_token')?.value ?? null;

  let membership = await fetchHouseholdMembership(supabase, user.id);

  if (!membership && inviteToken) {
    const serviceClient = createSupabaseServiceRoleClient();
    const shareInfo = await fetchInviteInfo(serviceClient, inviteToken);

    if (shareInfo && shareInfo.status === 'valid' && shareInfo.household_id) {
      const { error: joinError } = await supabase
        .from('household_members')
        .insert({
          household_id: shareInfo.household_id,
          user_id: user.id,
          role: 'member',
        });

      if (joinError && joinError.code !== '23505') {
        console.error('join household failed', joinError);
      } else {
        membership = { household_id: shareInfo.household_id };
        setOnboardingStatus('completed');
      }
    }
  }

  const destination = membership ? '/home' : '/onboarding';
  const response = NextResponse.redirect(new URL(destination, url.origin));

  if (inviteToken) {
    response.cookies.set({
      name: 'invite_token',
      value: '',
      maxAge: 0,
      path: '/',
    });
  }

  return response;
}
