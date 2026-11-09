import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { createOpenAI } from '@ai-sdk/openai';
import { runAgent } from '@/agent/agent-core';
import {
  AGENT_PROVIDER_OPTIONS,
  buildSystemPrompt,
  DEFAULT_AGENT_MODEL,
} from '@/agent/constants';
import type { AgentContext } from '@/agent/context';
import { querySqlSnapshot } from '@/agent/tools/sqlite-query';
import type { AgentToolExecutors } from '@/agent/tools/tools';
import { type NormalizedToolCall, normalizeToolCalls } from '@/agent/trace';
import {
  buildHouseholdCases,
  type HouseholdCase,
  type HouseholdFixture,
} from './household-cases';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
function assess(
  test: HouseholdCase,
  text: string,
  calls: NormalizedToolCall[],
) {
  const numbers = [...text.matchAll(/\d[\d.,]*/g)].flatMap(match => [
    Number(match[0]),
    Number(match[0].replaceAll(',', '')),
    Number(match[0].replaceAll('.', '').replace(',', '.')),
  ]);
  return {
    answered: Boolean(text.trim()),
    sqlOnly: calls.every(call => call.tool === 'querySql'),
    scope:
      calls.length > 0 &&
      calls.every(
        call => (call.input as { scope: string }).scope === test.scope,
      ),
    queryBudget: calls.length <= 10,
    expectedAnswer:
      test.expected.kind === 'amounts'
        ? test.expected.amounts.every(amount => numbers.includes(amount))
        : /no.{0,80}(ingres|calcul|determin)|sin.{0,50}ingres|indefin/i.test(
            text,
          ) && !/[\d][\d.,]*\s*%/.test(text),
    toolErrors: calls.filter(
      call => (call.output as { errorCode?: string })?.errorCode,
    ).length,
    requiresIndependentReview: true,
  };
}
async function main() {
  const args = process.argv.slice(2);
  const unknown = args.find(
    arg =>
      !['--help', '--reference'].includes(arg) && !arg.startsWith('--filter='),
  );
  if (unknown)
    throw new Error(
      `Unknown option: ${unknown}. Use --help. Legacy options belong to pnpm agent:eval:legacy.`,
    );
  if (args.includes('--help')) {
    console.log(
      'Usage: pnpm agent:eval [--filter=case-id-substring] [--reference]\nRuns the synthetic household suite. --reference prints expected values without API calls.\nLegacy suite: pnpm agent:eval:legacy (use --held-out there).\nTyped examples: pnpm agent:eval:typed.',
    );
    return;
  }
  if (
    args.filter(arg => arg.startsWith('--filter=')).length > 1 ||
    args.includes('--filter=')
  )
    throw new Error('Provide one nonempty --filter value.');
  const raw = readFileSync(
    'evals/mocks/dataset/household-typed.synthetic.json',
    'utf8',
  );
  const fixture = JSON.parse(raw) as HouseholdFixture;
  const tests = buildHouseholdCases(fixture);
  const filter = args.find(arg => arg.startsWith('--filter='))?.slice(9);
  const selected = tests.filter(test => !filter || test.id.includes(filter));
  if (!selected.length) throw new Error('No matching household cases');
  if (args.includes('--reference')) {
    console.log(
      JSON.stringify({ fixtureHash: hash(raw), cases: selected }, null, 2),
    );
    return;
  }
  for (const file of ['.env.local', '.env'])
    if (existsSync(file)) loadEnvFile(file);
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required');
  const modelId = process.env.MOMO_AGENT_MODEL ?? DEFAULT_AGENT_MODEL;
  const context: AgentContext = {
    currency: 'COP',
    currentDate: fixture.metadata.currentDate,
    timezone: 'America/Bogota',
    householdId: fixture.metadata.householdId,
    auth: {
      userId: fixture.metadata.ownerId,
      accessToken: 'synthetic-only',
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'synthetic-only',
    },
  };
  const toolExecutors: AgentToolExecutors = {
    querySql: async input =>
      querySqlSnapshot(
        fixture.rows.filter(row =>
          input.scope === 'personal'
            ? row.user_id === fixture.metadata.ownerId
            : row.household_id === fixture.metadata.householdId,
        ),
        input,
        'COP',
      ),
  };
  const system = buildSystemPrompt(context);
  const metadata = {
    model: modelId,
    providerOptions: AGENT_PROVIDER_OPTIONS,
    modelConfigHash: hash(
      JSON.stringify({ modelId, providerOptions: AGENT_PROVIDER_OPTIONS }),
    ),
    promptHash: hash(system),
    fixtureHash: hash(raw),
    currentDate: context.currentDate,
    synthetic: true,
  };
  const directory = path.resolve(
    process.env.MOMO_EVAL_OUTPUT ??
      `.scratch/momo-household-evals/${new Date().toISOString().replaceAll(':', '-')}`,
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'fixture.snapshot'), raw);
  writeFileSync(
    path.join(directory, `prompt-${metadata.promptHash}.txt`),
    system,
  );
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const summaries = [];
  for (const test of selected) {
    const started = Date.now();
    try {
      const result = await runAgent({
        model: openai(modelId),
        system,
        messages: [{ role: 'user', content: test.question }],
        context,
        toolExecutors,
      });
      const calls = normalizeToolCalls(result);
      const assessment = assess(test, result.text, calls);
      if (
        ![
          assessment.answered,
          assessment.sqlOnly,
          assessment.scope,
          assessment.queryBudget,
          assessment.expectedAnswer,
        ].every(Boolean)
      ) {
        process.exitCode = 1;
      }
      const trace = {
        ...metadata,
        id: test.id,
        question: test.question,
        text: result.text,
        calls,
        expected: test.expected,
        assessment,
        durationMs: Date.now() - started,
      };
      writeFileSync(
        path.join(directory, `${test.id}.json`),
        JSON.stringify(trace, null, 2),
      );
      summaries.push({ id: test.id, assessment, durationMs: trace.durationMs });
      console.log(JSON.stringify(summaries.at(-1)));
    } catch (error) {
      const failure = {
        ...metadata,
        id: test.id,
        error: error instanceof Error ? error.message : 'Evaluation failed',
      };
      writeFileSync(
        path.join(directory, `${test.id}.json`),
        JSON.stringify(failure, null, 2),
      );
      summaries.push(failure);
      console.error(JSON.stringify(failure));
      process.exitCode = 1;
    }
  }
  writeFileSync(
    path.join(directory, 'summary.json'),
    JSON.stringify(
      {
        ...metadata,
        count: selected.length,
        cases: summaries,
        assessmentMethod:
          'Mechanical amount/scope checks plus independent review required.',
      },
      null,
      2,
    ),
  );
  console.log(`Local synthetic household traces: ${directory}`);
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed');
  process.exitCode = 1;
});
