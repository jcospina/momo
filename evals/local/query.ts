import { readFileSync } from 'node:fs';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { buildSystemPrompt } from '@/agent/constants';
import { fixtureRuntime } from './fixtures';

async function main() {
  const currency = process.argv[2] ?? 'COP';
  if (!['COP', 'USD', 'EUR'].includes(currency))
    throw new Error('Expected COP, USD or EUR');
  const runtime = fixtureRuntime(currency as SupportedCurrency);
  if (process.argv.includes('--prompt')) {
    console.log(buildSystemPrompt(runtime.context));
    return;
  }
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (
    !['personal', 'household'].includes(input.scope) ||
    typeof input.sql !== 'string' ||
    !Array.isArray(input.parameters)
  ) {
    throw new Error('Expected JSON {scope, sql, parameters} on stdin');
  }
  console.log(
    JSON.stringify(
      await runtime.toolExecutors.querySql(input, runtime.context),
    ),
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Query failed');
  process.exitCode = 1;
});
