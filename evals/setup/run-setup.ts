import { execSync } from 'node:child_process';
import type {
  EvalRuntimeByCurrency,
  EvalRuntimeContext,
} from '@evals/types/setup';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import {
  assertSupabaseRunning,
  getLocalSupabaseEnv,
} from '@scripts/lib/supabase-env';
import { buildAuthContexts } from './build-auth-contexts';
import { seedEvalFixtures } from './seed-fixtures';
import { seedEvalUsers } from './seed-users';

export type {
  EvalRuntimeByCurrency,
  EvalRuntimeContext,
} from '@evals/types/setup';

/**
 * Prepares the local Supabase for an eval run — incrementally, without a full
 * DB reset.
 *
 * Steps, in order:
 *  1. Verify Supabase is running (no auto-start; fails loud if down).
 *  2. `supabase migration up --local` — no-op when schema is current,
 *     applies pending migrations otherwise. Avoids the multi-second
 *     migration replay of `db reset`.
 *  3. Idempotently ensure six eval users + three (owner, member, household)
 *     triples exist. Users live in their own `eval-*@momo.local` namespace
 *     so they coexist with dev seed data and persist across runs.
 *  4. Wipe expenses for the three eval households and reinsert from the
 *     fixtures (tags regenerated per row).
 *  5. Sign each owner in, smoke-checking the RPC returns >0 rows.
 *
 * Returns one `EvalRuntimeContext` per supported currency. The eval task
 * picks the right one based on `testCase.metadata.currency`.
 */
export async function runEvalSetup(): Promise<EvalRuntimeByCurrency> {
  const log = (msg: string) => console.log(`[eval-setup] ${msg}`);

  log('checking local Supabase…');
  assertSupabaseRunning();
  getLocalSupabaseEnv();

  log('applying pending migrations…');
  execSync('supabase migration up --local', { stdio: 'inherit' });

  log('ensuring eval users + households…');
  const identities = await seedEvalUsers();
  log(`ensured ${identities.size} (owner, member, household) triples`);

  log('refreshing fixture expenses…');
  const summary = await seedEvalFixtures(identities);
  const breakdown = Object.entries(summary.perCurrency)
    .map(
      ([currency, info]) =>
        `${currency}=${info.rowCount}@${info.referenceDate}`,
    )
    .join(', ');
  log(`inserted ${summary.totalRows} expenses (${breakdown})`);

  log('minting auth contexts (signInWithPassword)…');
  const auth = await buildAuthContexts(identities);
  log(`minted ${auth.size} auth contexts; smoke checks passed`);

  const runtime: EvalRuntimeByCurrency = new Map();
  for (const [currency, info] of Object.entries(summary.perCurrency) as Array<
    [SupportedCurrency, (typeof summary.perCurrency)[SupportedCurrency]]
  >) {
    const authCtx = auth.get(currency);
    if (!authCtx) {
      throw new Error(`Missing auth context for ${currency} after setup`);
    }
    runtime.set(currency, {
      auth: authCtx,
      referenceDate: info.referenceDate,
    });
  }

  return runtime;
}
