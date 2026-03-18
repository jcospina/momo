import { createSupabaseServerClient } from '@lib-supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { access_token, expires_in } = session;

  return NextResponse.json(
    {
      access_token,
      expires_in,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
