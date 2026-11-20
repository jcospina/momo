import type { HouseholdMembership } from '@lib-types/households';
import type { OnboardingStatus } from '@lib-types/user-preferences';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

/** The signed-in user, taken from the verified access token's claims. */
export type ProxyUser = { id: string };

export type ProxyContext = {
  request: NextRequest;
  pathname: string;
  supabase: SupabaseClient;
  user: ProxyUser | null;
  /**
   * The household and onboarding state are only looked up where a rule
   * needs them ('/', '/onboarding' and '/home'), and /home skips the lookup
   * once onboarding is remembered as finished (see onboarded-cookie.ts).
   * When not looked up, membership is null and hasHousehold is false.
   */
  membership: HouseholdMembership | null;
  hasHousehold: boolean;
  onboardingStatus: OnboardingStatus;
  redirect: (path: string) => NextResponse;
  next: () => NextResponse;
};

export type ProxyRule = (ctx: ProxyContext) => NextResponse | void;
