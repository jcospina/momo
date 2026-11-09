import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { createOpenAI } from '@ai-sdk/openai';
import { testCases } from '@evals/momo-agent-cases';
import { runAgent } from '@/agent/agent-core';
import {
  AGENT_PROVIDER_OPTIONS,
  buildSystemPrompt,
  DEFAULT_AGENT_MODEL,
} from '@/agent/constants';
import { normalizeToolCalls } from '@/agent/trace';
import { assessAnswer } from './assess';
import { fixtureRuntime } from './fixtures';
import { heldOutCases } from './held-out';

async function main() {
  // Keep shell overrides; local values take precedence over the base file.
  for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) loadEnvFile(file);
  }
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required');
  const modelId = process.env.MOMO_AGENT_MODEL ?? DEFAULT_AGENT_MODEL;
  const modelConfigHash = hash(
    JSON.stringify({ modelId, providerOptions: AGENT_PROVIDER_OPTIONS }),
  );
  const suite = process.argv.includes('--held-out') ? 'held-out' : 'golden';
  const filter = process.argv
    .find(arg => arg.startsWith('--filter='))
    ?.slice(9);
  const selected = (suite === 'held-out' ? heldOutCases : testCases).filter(
    testCase => !filter || testCase.id.includes(filter),
  );
  if (!selected.length) throw new Error('No matching cases');
  const output = path.resolve(
    process.env.MOMO_EVAL_OUTPUT ??
      `.scratch/momo-sql-evals/${new Date().toISOString().replaceAll(':', '-')}`,
  );
  mkdirSync(output, { recursive: true });
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const summaries: unknown[] = [];
  for (const testCase of selected) {
    const runtime = fixtureRuntime(testCase.metadata.currency);
    const systemPrompt = buildSystemPrompt(runtime.context);
    const promptHash = hash(systemPrompt);
    writeFileSync(path.join(output, `prompt-${promptHash}.txt`), systemPrompt);
    const started = Date.now();
    try {
      const result = await runAgent({
        model: openai(modelId),
        system: systemPrompt,
        messages: [{ role: 'user', content: testCase.input }],
        context: runtime.context,
        toolExecutors: runtime.toolExecutors,
      });
      const calls = normalizeToolCalls(result);
      const assessment = assessAnswer(testCase, result.text, calls);
      const trace = {
        id: testCase.id,
        model: modelId,
        modelConfigHash,
        promptHash,
        providerOptions: AGENT_PROVIDER_OPTIONS,
        suite,
        input: testCase.input,
        currency: testCase.metadata.currency,
        currentDate: runtime.context.currentDate,
        text: result.text,
        calls,
        expected: testCase.expected,
        assessment,
        durationMs: Date.now() - started,
      };
      writeFileSync(
        path.join(output, `${testCase.id}.json`),
        JSON.stringify(trace, null, 2),
      );
      summaries.push({
        id: testCase.id,
        assessment,
        durationMs: trace.durationMs,
      });
      console.log(
        JSON.stringify({
          id: testCase.id,
          assessment,
          durationMs: trace.durationMs,
        }),
      );
    } catch (error) {
      const failure = {
        id: testCase.id,
        model: modelId,
        modelConfigHash,
        promptHash,
        error: error instanceof Error ? error.message : 'Run failed',
      };
      summaries.push(failure);
      writeFileSync(
        path.join(output, `${testCase.id}.json`),
        JSON.stringify(failure, null, 2),
      );
      console.error(JSON.stringify(failure));
      process.exitCode = 1;
    }
  }
  writeFileSync(
    path.join(output, 'summary.json'),
    JSON.stringify(
      {
        model: modelId,
        modelConfigHash,
        providerOptions: AGENT_PROVIDER_OPTIONS,
        suite,
        count: selected.length,
        assessmentMethod:
          'Mechanical smoke checks; final answers and ambiguous goldens require independent review.',
        cases: summaries,
      },
      null,
      2,
    ),
  );
  console.log(`Local traces: ${output}`);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed');
  process.exitCode = 1;
});

import { createHash } from 'node:crypto';
