import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@lib-supabase/server';

type ClientLogPayload = {
  level?: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ClientLogPayload;
  const level = payload.level ?? 'info';
  const message = payload.message ?? 'client-log';
  const context = payload.context ?? {};
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email ?? null;
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absMinutes / 60));
  const offsetMins = pad(absMinutes % 60);
  const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${sign}${offsetHours}:${offsetMins}`;

  if (level === 'error') {
    console.error('[client]', message, {
      timestamp,
      ...context,
      user_email: userEmail,
    });
  } else if (level === 'warn') {
    console.warn('[client]', message, {
      timestamp,
      ...context,
      user_email: userEmail,
    });
  } else {
    console.info('[client]', message, {
      timestamp,
      ...context,
      user_email: userEmail,
    });
  }

  return NextResponse.json({ ok: true });
}
