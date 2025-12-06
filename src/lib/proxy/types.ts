import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

import type { HouseholdMembership } from '@lib-types/households';

export type ProxyContext = {
  request: NextRequest;
  pathname: string;
  supabase: SupabaseClient;
  user: User | null;
  membership: HouseholdMembership | null;
  hasHousehold: boolean;
  onboardingStatus: 'unknown' | 'skipped' | 'completed';
  redirect: (path: string) => NextResponse;
  next: () => NextResponse;
};

export type ProxyRule = (ctx: ProxyContext) => NextResponse | void;
