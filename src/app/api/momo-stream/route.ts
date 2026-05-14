import { sendMomoMessage } from '@actions/chat-messages';
import { createOpenAI } from '@ai-sdk/openai';
import { getUserPreferences } from '@helpers/user-prefs';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { NextResponse } from 'next/server';
import { streamAgent } from '@/agent/agent-core';
import type { AgentContext } from '@/agent/context';
import { productionToolExecutors } from '@/agent/tools/tools';

type MomoStreamRequest = {
  content?: string;
  householdId?: string | null;
  triggeringMessageId?: string;
};

const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

// `MOMO_AGENT_MODEL` is shared with `evals/momo-agent.eval.ts` so any model
// change can be validated against the eval harness without code changes.
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const modelId = process.env.MOMO_AGENT_MODEL ?? 'gpt-5.4-mini';

export async function POST(request: Request) {
  const payload = (await request.json()) as MomoStreamRequest;
  const content = payload?.content;
  const householdId =
    typeof payload?.householdId === 'string'
      ? payload.householdId.trim() || null
      : null;
  const triggeringMessageId = payload?.triggeringMessageId;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  if (typeof triggeringMessageId !== 'string' || !triggeringMessageId.trim()) {
    return NextResponse.json(
      { error: 'triggering_message_id_required' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const prefs = await getUserPreferences(user.id);
  const currency: SupportedCurrency = prefs?.currency ?? DEFAULT_CURRENCY;

  const context: AgentContext = {
    currency,
    auth: {
      userId: user.id,
      accessToken: session.access_token,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  };

  const result = streamAgent({
    context,
    messages: [{ role: 'user', content }],
    model: openai(modelId),
    toolExecutors: productionToolExecutors,
    onFinish: async ({ text }) => {
      const persisted = await sendMomoMessage({
        content: text,
        householdId,
        userId: user.id,
        triggeringMessageId,
      });

      if (persisted.errorCode) {
        // Non-fatal: the user already received the streamed reply, so a
        // persistence failure must not break the stream response.
        console.error('[momo-stream] persistence failed', {
          errorCode: persisted.errorCode,
          triggeringMessageId,
        });
      }
    },
  });

  return result.toTextStreamResponse();
}
