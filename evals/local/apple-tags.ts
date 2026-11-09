import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createOpenAI } from '@ai-sdk/openai';
import { runAgent } from '@/agent/agent-core';
import {
  AGENT_PROVIDER_OPTIONS,
  buildSystemPrompt,
  DEFAULT_AGENT_MODEL,
} from '@/agent/constants';
import type { AgentContext } from '@/agent/context';
import type { SqlExpenseRow } from '@/agent/tools/sql-types';
import { querySqlSnapshot } from '@/agent/tools/sqlite-query';
import { normalizeToolCalls } from '@/agent/trace';

const base: SqlExpenseRow = {
  id: 'one',
  user_id: 'owner',
  household_id: null,
  amount_cents: 1299,
  currency: 'USD',
  expense_date: '2026-11-09',
  merchant: null,
  category: 'subscriptions',
  note: 'Monthly charge',
  tags: ['apple', 'apple services', 'services'],
};
const unrelated: SqlExpenseRow = {
  ...base,
  id: 'other',
  amount_cents: 8800,
  note: 'Other streaming service',
  tags: ['netflix'],
};
const cases = [
  { id: 'tags-only', rows: [base, unrelated], expected: '12.99' },
  {
    id: 'note-only',
    rows: [{ ...base, note: 'Apple subscription', tags: [] }, unrelated],
    expected: '12.99',
  },
  {
    id: 'mixed-evidence',
    rows: [
      base,
      {
        ...base,
        id: 'two',
        note: 'iCloud storage',
        tags: ['cloud'],
        amount_cents: 299,
      },
      {
        ...base,
        id: 'three',
        note: 'Purchase',
        merchant: 'Apple',
        tags: [],
        amount_cents: 2499,
      },
      {
        ...base,
        id: 'four',
        note: 'Apple Music subscription',
        tags: ['apple', 'apple music'],
        amount_cents: 1099,
      },
      {
        ...base,
        id: 'fruit',
        note: 'Apples at grocery store',
        category: 'groceries',
        tags: ['apples'],
        amount_cents: 500,
      },
      unrelated,
    ],
    expected: '51.96',
  },
];

async function main() {
  for (const file of ['.env.local', '.env'])
    if (existsSync(file)) loadEnvFile(file);
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required');
  const modelId = process.env.MOMO_AGENT_MODEL ?? DEFAULT_AGENT_MODEL;
  const model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId);
  const context: AgentContext = {
    currency: 'USD',
    currentDate: '2026-11-09',
    auth: {
      userId: 'owner',
      accessToken: 'fixture',
      supabaseUrl: 'http://localhost',
      supabaseAnonKey: 'fixture',
    },
  };
  const system = buildSystemPrompt(context);
  const output = `.scratch/momo-sql-evals/apple-tags-${new Date().toISOString().replaceAll(':', '-')}`;
  mkdirSync(output, { recursive: true });
  writeFileSync(`${output}/prompt.txt`, system);
  const summary = [];
  for (const testCase of cases) {
    for (const [locale, question] of [
      ['en', 'How much have I spent on Apple?'],
      ['es', 'Cuánto he gastado en Apple?'],
    ]) {
      const result = await runAgent({
        model,
        context,
        system,
        messages: [{ role: 'user', content: question }],
        toolExecutors: {
          querySql: async input =>
            querySqlSnapshot(
              input.scope === 'personal' ? testCase.rows : [],
              input,
              'USD',
            ),
        },
      });
      const calls = normalizeToolCalls(result);
      const evidencePresent = calls.some(call => {
        const output = call.output as {
          errorCode?: string;
          rows?: Record<string, unknown>[];
        };
        return (
          !output.errorCode &&
          output.rows?.some(row =>
            Object.values(row).some(
              value =>
                value === Math.round(Number(testCase.expected) * 100) ||
                value === Number(testCase.expected) ||
                value === `USD ${testCase.expected}`,
            ),
          )
        );
      });
      const tagsChecked =
        testCase.id === 'note-only' ||
        calls.some(call =>
          /\b(?:tags|expense_tags)\b/i.test(
            (call.input as { sql: string }).sql,
          ),
        );
      const passed =
        evidencePresent &&
        tagsChecked &&
        (result.text.includes(testCase.expected) ||
          result.text.includes(testCase.expected.replace('.', ','))) &&
        calls.length <= 10 &&
        calls.every(
          call => (call.input as { scope: string }).scope === 'personal',
        );
      const trace = {
        id: `${testCase.id}-${locale}`,
        question,
        expected: testCase.expected,
        evidencePresent,
        tagsChecked,
        passed,
        text: result.text,
        calls,
        modelId,
        providerOptions: AGENT_PROVIDER_OPTIONS,
        promptHash: createHash('sha256').update(system).digest('hex'),
      };
      writeFileSync(
        `${output}/${trace.id}.json`,
        `${JSON.stringify(trace, null, 2)}\n`,
      );
      summary.push({
        id: trace.id,
        passed,
        text: result.text,
        queries: calls.length,
      });
      console.log(JSON.stringify(summary.at(-1)));
    }
  }
  writeFileSync(
    `${output}/summary.json`,
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(`Traces: ${output}`);
  if (summary.some(row => !row.passed)) process.exitCode = 1;
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed');
  process.exitCode = 1;
});
