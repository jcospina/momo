import { createOpenAI } from '@ai-sdk/openai';
import { testCases } from '@evals/momo-agent-cases';
import { buildMessages, normalizeToolCalls } from '@evals/scoring/normalize';
import { momoAgentScorers } from '@evals/scoring/scorers';
import { runEvalSetup } from '@evals/setup/run-setup';
import type { MomoAgentEvalCase } from '@evals/types/cases';
import type { EvalMetadata, MomoAgentEvalOutput } from '@evals/types/scoring';
import { Eval } from 'braintrust';
import { runAgent } from '@/agent/agent-core';
import { productionToolExecutors } from '@/agent/tools/supabase-executors';
import type { AgentToolExecutors } from '@/agent/tools/tools';

/**
 * Setup is kicked off at module-load time so the supabase reset+seed runs
 * concurrently with braintrust's case enumeration. The `task` awaits this
 * promise on every case; the first awaiter pays the cost, the rest get the
 * resolved value.
 *
 * (We can't use top-level `await` because braintrust compiles to CJS.)
 */
const evalSetup = runEvalSetup();

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const modelId = process.env.MOMO_AGENT_MODEL ?? 'gpt-5.4-mini';

/**
 * Wraps the prod executors so `resolveDateRange` is anchored to the fixture's
 * `endDate` whenever the agent didn't supply its own `referenceDate`. Without
 * this, presets like "last_month" drift with the wall clock — which makes
 * frozen fixture expectations wrong every time the calendar turns.
 */
function anchoredExecutors(referenceDate: string): AgentToolExecutors {
  return {
    ...productionToolExecutors,
    resolveDateRange: (input, context) =>
      productionToolExecutors.resolveDateRange(
        { ...input, referenceDate: input.referenceDate ?? referenceDate },
        context,
      ),
  };
}

Eval<MomoAgentEvalCase, MomoAgentEvalOutput, MomoAgentEvalCase, EvalMetadata>(
  'MoMo Agent',
  {
    data: () =>
      testCases.map(testCase => ({
        input: testCase,
        expected: testCase,
        metadata: {
          ...testCase.metadata,
          id: testCase.id,
          pairId: testCase.pairId,
          locale: testCase.locale,
          category: testCase.category,
          difficulty: testCase.difficulty,
          toolMode: 'supabase',
        },
        tags: [
          testCase.locale,
          testCase.category,
          testCase.difficulty,
          testCase.metadata.scope,
          testCase.metadata.answerability,
        ],
      })),
    task: async testCase => {
      const runtimeByCurrency = await evalSetup;
      const runtime = runtimeByCurrency.get(testCase.metadata.currency);
      if (!runtime) {
        throw new Error(
          `No eval runtime seeded for ${testCase.metadata.currency} (case ${testCase.id})`,
        );
      }

      const result = await runAgent({
        model: openai(modelId),
        messages: buildMessages(testCase),
        context: {
          currency: testCase.metadata.currency,
          auth: runtime.auth,
        },
        toolExecutors: anchoredExecutors(runtime.referenceDate),
      });
      const calls = normalizeToolCalls(result);

      return {
        text: result.text,
        tools: calls.map(call => call.tool),
        calls,
      };
    },
    scores: momoAgentScorers,
  },
);
