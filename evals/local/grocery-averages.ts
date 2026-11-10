import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createOpenAI } from '@ai-sdk/openai';
import { runAgent } from '@/agent/agent-core';
import { buildSystemPrompt, DEFAULT_AGENT_MODEL } from '@/agent/constants';
import type { AgentContext } from '@/agent/context';
import type { SqlExpenseRow } from '@/agent/tools/sql-types';
import { querySqlSnapshot } from '@/agent/tools/sqlite-query';
import { normalizeToolCalls } from '@/agent/trace';

// Invented expenses: a category contains more semantic coverage than one tag.
export const groceryRows: SqlExpenseRow[] = ['07', '08', '09', '10'].flatMap(
  month =>
    [
      { category: 'groceries', note: 'mercado 400000', amount_cents: 400000 },
      {
        category: 'groceries',
        note: 'compra semanal 500000',
        amount_cents: 500000,
      },
      {
        category: 'groceries',
        note: 'frutas y verduras 300000',
        amount_cents: 300000,
      },
      { category: 'groceries', note: 'despensa 300000', amount_cents: 300000 },
      {
        category: 'dining',
        note: 'almuerzo mercado central 200000',
        amount_cents: 200000,
      },
      { category: 'income', note: 'salario 5000000', amount_cents: 5000000 },
    ].map((row, index) => ({
      ...row,
      id: `${month}-${index}`,
      user_id: index % 2 === 0 ? 'owner' : 'other-member',
      household_id: 'home',
      currency: 'COP',
      expense_date: `2026-${month}-15`,
      merchant: null,
      tags: [],
    })),
);

groceryRows.push({
  ...groceryRows[0],
  id: 'private',
  household_id: null,
  amount_cents: 9000000,
  note: 'mercado privado',
});

async function main() {
  for (const file of ['.env.local', '.env'])
    if (existsSync(file)) loadEnvFile(file);
  const context: AgentContext = {
    currency: 'COP',
    currentDate: '2026-11-09',
    householdId: 'home',
    auth: {
      userId: 'owner',
      accessToken: 'fixture',
      supabaseUrl: 'http://localhost',
      supabaseAnonKey: 'fixture',
    },
  };
  const promptFile = process.argv
    .find(arg => arg.startsWith('--prompt='))
    ?.slice(9);
  const system = promptFile
    ? readFileSync(promptFile, 'utf8')
    : buildSystemPrompt(context);
  const output =
    process.env.MOMO_EVAL_OUTPUT ??
    `.scratch/momo-grocery-evals/${new Date().toISOString().replaceAll(':', '-')}`;
  mkdirSync(output, { recursive: true });
  writeFileSync(`${output}/prompt.txt`, system);
  writeFileSync(`${output}/fixture.json`, JSON.stringify(groceryRows, null, 2));
  const groceries = groceryRows.filter(
    row => row.category === 'groceries' && row.household_id === 'home',
  );
  const monthly: Record<string, number> = {};
  for (const row of groceries) {
    const month = row.expense_date.slice(0, 7);
    monthly[month] = (monthly[month] ?? 0) + row.amount_cents;
  }
  const totals = Object.values(monthly);
  const expected = {
    total: totals.reduce((a, b) => a + b, 0),
    monthlyAverage: totals.reduce((a, b) => a + b, 0) / totals.length,
    transactionAverage:
      groceries.reduce((sum, row) => sum + row.amount_cents, 0) /
      groceries.length,
    months: Object.keys(monthly),
  };
  console.log(JSON.stringify({ expected }));
  if (process.argv.includes('--reference')) return;
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY required');
  const modelId = process.env.MOMO_AGENT_MODEL ?? DEFAULT_AGENT_MODEL;
  const model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId);
  const personalGroceriesTotal = groceryRows
    .filter(row => row.user_id === 'owner' && row.category === 'groceries')
    .reduce((sum, row) => sum + row.amount_cents, 0);
  const cases = [
    [
      'ambiguous',
      'cuál es el promedio de gastos en mercado @momo',
      expected.monthlyAverage,
      'household',
    ],
    [
      'monthly',
      'promedio mensual de gastos en mercado/groceries',
      expected.monthlyAverage,
      'household',
    ],
    [
      'explicit-period',
      'Cuál es mi promedio mensual de gastos en mercado de julio a octubre de 2026?',
      expected.monthlyAverage,
      'household',
    ],
    [
      'semantic-synonym',
      'Cuánto gastamos en promedio mensual en víveres?',
      expected.monthlyAverage,
      'household',
    ],
    [
      'per-purchase',
      'Cuál es el promedio por compra individual de mercado?',
      expected.transactionAverage,
      'household',
    ],
    [
      'zero-month',
      'Cuál es el promedio mensual en mercado de julio a noviembre de 2026, incluyendo los meses sin compras?',
      expected.total / 5,
      'household',
    ],
    [
      'personal-override',
      'Solo mis gastos personales, no el hogar: promedio mensual de mercado de julio a octubre de 2026?',
      personalGroceriesTotal / 4,
      'personal',
    ],
  ] as const;
  const filter = process.argv
    .find(arg => arg.startsWith('--filter='))
    ?.slice(9);
  for (const [id, question, expectedAmount, expectedScope] of cases) {
    if (filter && !id.includes(filter)) continue;
    const result = await runAgent({
      model,
      context,
      system,
      messages: [{ role: 'user', content: question }],
      toolExecutors: {
        querySql: input =>
          querySqlSnapshot(
            groceryRows.filter(row =>
              input.scope === 'personal'
                ? row.user_id === 'owner'
                : row.household_id === 'home',
            ),
            input,
            'COP',
          ),
      },
    });
    const calls = normalizeToolCalls(result);
    const normalizeMoney = (text: string) => text.replaceAll(',', '');
    const passed =
      calls.every(
        call => (call.input as { scope: string }).scope === expectedScope,
      ) &&
      normalizeMoney(result.text).includes(`COP ${expectedAmount}`) &&
      calls.some(call =>
        normalizeMoney(JSON.stringify(call.output)).includes(
          `COP ${expectedAmount}`,
        ),
      );
    const trace = {
      id,
      question,
      expected,
      expectedAmount,
      expectedScope,
      modelId,
      toolErrors: calls.filter(
        call => (call.output as { errorCode?: string })?.errorCode,
      ).length,
      passed,
      text: result.text,
      calls,
    };
    writeFileSync(`${output}/${id}.json`, JSON.stringify(trace, null, 2));
    console.log(
      JSON.stringify({ id, passed, text: result.text, queries: calls.length }),
    );
    if (!passed) process.exitCode = 1;
  }
  console.log(`Traces: ${output}`);
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Evaluation failed');
  process.exitCode = 1;
});
