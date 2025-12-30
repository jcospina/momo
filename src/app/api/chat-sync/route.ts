import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@lib-supabase/server';

type SyncRequest = {
  household_id: string;
  cursor_created_at?: string | null;
  cursor_id?: string | null;
  limit?: number;
};

const CHAT_SELECT =
  'id, household_id, user_id, content, status, expense_count, created_at, sender_name';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

export async function POST(request: Request) {
  const payload = (await request.json()) as SyncRequest;
  const householdId = payload?.household_id?.trim?.();

  if (!householdId) {
    return NextResponse.json(
      { error: 'household_id_required' },
      { status: 400 },
    );
  }

  const cursorCreatedAt = payload?.cursor_created_at ?? null;
  const cursorId = payload?.cursor_id ?? null;
  const limitInput = Number.isFinite(payload?.limit)
    ? Number(payload.limit)
    : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitInput, 1), MAX_LIMIT);

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('chat_messages')
    .select(CHAT_SELECT)
    .eq('household_id', householdId);

  if (cursorCreatedAt && cursorId) {
    query = query
      .or(
        `created_at.gt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.gt.${cursorId})`,
      )
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);
  } else {
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('chat sync failed', error);
    return NextResponse.json({ error: 'chat_sync_failed' }, { status: 500 });
  }

  const messages =
    cursorCreatedAt && cursorId ? (data ?? []) : (data ?? []).reverse();

  return NextResponse.json(
    { messages },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
