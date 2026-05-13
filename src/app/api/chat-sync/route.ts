import { createSupabaseServerClient } from '@lib-supabase/server';
import { CHAT_MESSAGE_SELECT } from '@utils/chat-message';
import { NextResponse } from 'next/server';

type SyncRequest = {
  household_id?: string | null;
  cursor_created_at?: string | null;
  cursor_id?: string | null;
  limit?: number;
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

export async function POST(request: Request) {
  const payload = (await request.json()) as SyncRequest;
  const householdId =
    typeof payload?.household_id === 'string'
      ? payload.household_id.trim() || null
      : null;

  const cursorCreatedAt = payload?.cursor_created_at ?? null;
  const cursorId = payload?.cursor_id ?? null;
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

  let query = supabase.from('chat_messages').select(CHAT_MESSAGE_SELECT);

  if (householdId) {
    query = query.eq('household_id', householdId);
  } else {
    query = query.is('household_id', null).eq('user_id', user.id);
  }

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
