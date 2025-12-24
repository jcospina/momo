import { NextResponse } from 'next/server';

import { fetchChatHistory } from '@helpers/chat-messages';
import { createSupabaseServerClient } from '@lib-supabase/server';

type HistoryRequest = {
  household_id?: string | null;
  before_created_at?: string | null;
  before_id?: string | null;
  limit?: number;
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function POST(request: Request) {
  const payload = (await request.json()) as HistoryRequest;
  const householdId = payload?.household_id?.trim?.() ?? null;
  const cursorCreatedAt = payload?.before_created_at ?? null;
  const cursorId = payload?.before_id ?? null;
  const limitInput = Number.isFinite(payload?.limit)
    ? Number(payload.limit)
    : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitInput, 1), MAX_LIMIT);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const messages = await fetchChatHistory({
    supabase,
    householdId,
    userId: user.id,
    limit,
    before:
      cursorCreatedAt && cursorId
        ? { created_at: cursorCreatedAt, id: cursorId }
        : null,
  });

  return NextResponse.json(
    { messages },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
