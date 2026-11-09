import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { createOpenAI } from '@ai-sdk/openai';
import { parseChatEntries } from '@helpers/expenses/expense-parser';
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

type Scope = 'personal' | 'household';
type Locale = 'en' | 'es';
const entries = [
  '25 almuerzo crepes',
  '30 almuerzo kntina',
  '60 almuerzo wings',
];

function fixture(contrast: boolean): SqlExpenseRow[] {
  return [...entries, ...(contrast ? ['35 cena crepes'] : [])].map(
    (entry, index) => {
      const result = parseChatEntries(entry, 'COP');
      const parsed = result.entries[0];
      if (!parsed || result.errors.length)
        throw new Error(`Fixture parser failed: ${entry}`);
      return {
        id: `typed-${index}`,
        user_id: 'typed-owner',
        household_id: 'typed-home',
        amount_cents: parsed.amount_minor,
        currency: 'COP',
        expense_date: '2026-11-09',
        merchant: null,
        category: parsed.category ?? 'uncategorized',
        note: parsed.raw,
        tags: parsed.tags,
      };
    },
  );
}

function question(kind: string, scope: Scope, locale: Locale) {
  const subject =
    locale === 'en'
      ? scope === 'personal'
        ? 'I'
        : 'our household'
      : scope === 'personal'
        ? 'he'
        : 'hemos';
  if (locale === 'en') {
    if (kind === 'lunch')
      return `How much did ${subject} spend on lunch, and how many lunch purchases were there?`;
    if (kind === 'brand')
      return `How much did ${subject} spend at Crepes across all meals, and how many purchases were there?`;
    return `Break down ${scope === 'personal' ? 'my' : "our household's"} lunch spending by restaurant. Show the total for each place.`;
  }
  const scopeWords = scope === 'household' ? ' en total en el hogar' : '';
  if (kind === 'lunch')
    return `¿Cuánto ${subject} gastado en almuerzos${scopeWords} y cuántas compras de almuerzo hay?`;
  if (kind === 'brand')
    return `¿Cuánto ${subject} gastado en Crepes${scopeWords}, incluyendo todas las comidas, y cuántas compras hay?`;
  return `Desglosa ${scope === 'personal' ? 'mis gastos' : 'los gastos de nuestro hogar'} de almuerzo por restaurante. Muestra el total de cada sitio.`;
}

async function main() {
  for (const file of ['.env.local', '.env'])
    if (existsSync(file)) loadEnvFile(file);
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required');
  const modelId = process.env.MOMO_AGENT_MODEL ?? DEFAULT_AGENT_MODEL;
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const output = path.resolve(
    process.env.MOMO_EVAL_OUTPUT ??
      `.scratch/momo-sql-evals/typed-tags-${new Date().toISOString().replaceAll(':', '-')}`,
  );
  mkdirSync(output, { recursive: true });
  const filter = process.argv
    .find(arg => arg.startsWith('--filter='))
    ?.slice(9);
  const context: AgentContext = {
    currency: 'COP',
    currentDate: '2026-11-09',
    timezone: 'America/Bogota',
    householdId: 'typed-home',
    auth: {
      userId: 'typed-owner',
      accessToken: 'synthetic-fixture-only',
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'synthetic-fixture-only',
    },
  };
  const system = buildSystemPrompt(context);
  const promptHash = createHash('sha256').update(system).digest('hex');
  writeFileSync(path.join(output, 'prompt.txt'), system);
  const summaries: {
    id: string;
    pass: boolean;
    error?: string;
    durationMs: number;
  }[] = [];
  for (const contrast of [false, true])
    for (const kind of contrast
      ? ['lunch', 'brand']
      : ['lunch', 'brand', 'breakdown'])
      for (const scope of ['personal', 'household'] as Scope[])
        for (const locale of ['en', 'es'] as Locale[]) {
          const id = `${contrast ? 'dinner-contrast' : 'typed-three'}-${kind}-${scope}-${locale}`;
          if (filter && !id.includes(filter)) continue;
          const rows = fixture(contrast);
          const input = question(kind, scope, locale);
          const expected:
            | { total: number; count: number }
            | { crepes: number; kntina: number; wings: number } =
            kind === 'lunch'
              ? { total: 115, count: 3 }
              : kind === 'brand'
                ? { total: contrast ? 60 : 25, count: contrast ? 2 : 1 }
                : { crepes: 25, kntina: 30, wings: 60 };
          const started = Date.now();
          try {
            const result = await runAgent({
              model: openai(modelId),
              system,
              context,
              messages: [{ role: 'user', content: input }],
              toolExecutors: {
                querySql: query =>
                  querySqlSnapshot(
                    rows.filter(row =>
                      query.scope === 'personal'
                        ? row.user_id === context.auth?.userId
                        : row.household_id === context.householdId,
                    ),
                    query,
                    'COP',
                  ),
              },
            });
            const calls = normalizeToolCalls(result);
            const successful = calls.filter(
              call => !(call.output as { errorCode?: string })?.errorCode,
            );
            const evidence = successful
              .map(call => JSON.stringify(call.output))
              .join('\n');
            const normalizedAnswer = result.text
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toLowerCase();
            const amount = (value: number) =>
              new RegExp(`COP ${value}(?!\\d|[,.]\\d)`).test(result.text);
            const checks = {
              answered: Boolean(result.text.trim()),
              budget: calls.length > 0 && calls.length <= 10,
              scope: calls.every(
                call => (call.input as { scope: string }).scope === scope,
              ),
              sqlOnly: calls.every(call => call.tool === 'querySql'),
              noToolErrors: calls.length === successful.length,
              correctCount:
                !('count' in expected) ||
                new RegExp(
                  `\\b${expected.count === 1 ? '(1|one|un|una)' : expected.count === 2 ? '(2|two|dos)' : '(3|three|tres)'}\\b`,
                ).test(normalizedAnswer),
              correctAmounts:
                'total' in expected
                  ? amount(expected.total)
                  : Object.values(expected).every(amount),
              places:
                kind !== 'breakdown' ||
                ['crepes', 'kntina', 'wings'].every(name =>
                  normalizedAnswer.includes(name),
                ),
              evidence:
                'total' in expected
                  ? new RegExp(`:\\s*${expected.total}(?:[,}])`).test(evidence)
                  : Object.values(expected).every(value =>
                      new RegExp(`:\\s*${value}(?:[,}])`).test(evidence),
                    ),
            };
            const pass = Object.values(checks).every(Boolean);
            const trace = {
              id,
              input,
              expected,
              model: modelId,
              providerOptions: AGENT_PROVIDER_OPTIONS,
              promptHash,
              fixture: rows,
              text: result.text,
              calls,
              checks,
              pass,
              requiresHumanReview: true,
              durationMs: Date.now() - started,
            };
            writeFileSync(
              path.join(output, `${id}.json`),
              JSON.stringify(trace, null, 2),
            );
            summaries.push({ id, pass, durationMs: trace.durationMs });
            console.log(
              JSON.stringify({ id, pass, checks, answer: result.text }),
            );
          } catch (error) {
            const failure = {
              id,
              pass: false,
              error: error instanceof Error ? error.message : String(error),
              durationMs: Date.now() - started,
            };
            summaries.push(failure);
            writeFileSync(
              path.join(output, `${id}.json`),
              JSON.stringify(failure, null, 2),
            );
            console.error(JSON.stringify(failure));
          }
          writeFileSync(
            path.join(output, 'summary.json'),
            JSON.stringify(
              {
                model: modelId,
                providerOptions: AGENT_PROVIDER_OPTIONS,
                promptHash,
                summaries,
              },
              null,
              2,
            ),
          );
        }
  console.log(
    JSON.stringify({
      output,
      passed: summaries.filter(row => row.pass).length,
      total: summaries.length,
    }),
  );
  if (!summaries.length || summaries.some(row => !row.pass))
    process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
