import fs from 'node:fs';
import path from 'node:path';
import type {
  EvalFixtureTriple,
  EvalSeedIdentities,
  EvalSeedIdentity,
  FixtureSeedPerCurrency,
  GoldenFixture,
  GoldenRow,
  SeedFixturesSummary,
} from '@evals/types/setup';
import { extractTagNgrams } from '@helpers/expenses/expense-category';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { getLocalSupabaseEnv } from '@scripts/lib/supabase-env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EVAL_FIXTURE_TRIPLES } from './eval-fixtures';

export type {
  FixtureSeedPerCurrency,
  SeedFixturesSummary,
} from '@evals/types/setup';

const PLACEHOLDER_OWNER = 'sample-owner';
const PLACEHOLDER_MEMBER = 'sample-member';
const PLACEHOLDER_HOUSEHOLD = 'sample-household';

const INSERT_BATCH_SIZE = 500;

/**
 * Inserts the three currency fixtures into the local DB.
 *
 * For each row: substitutes the placeholder owner/member/household IDs with
 * the seeded UUIDs, then regenerates `tags` from `note` via the shared
 * `extractTagNgrams` helper so the eval reflects current tag derivation rather
 * than the (frozen, currency-partitioned) fixture's original tag snapshot.
 */
export async function seedEvalFixtures(
  identities: EvalSeedIdentities,
): Promise<SeedFixturesSummary> {
  const { url, serviceRoleKey } = getLocalSupabaseEnv();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const perCurrency: Partial<
    Record<SupportedCurrency, FixtureSeedPerCurrency>
  > = {};
  let totalRows = 0;

  for (const triple of EVAL_FIXTURE_TRIPLES) {
    const identity = identities.get(triple.currency);
    if (!identity) {
      throw new Error(
        `Missing seeded identity for currency ${triple.currency}; check seedEvalUsers ordering.`,
      );
    }

    const result = await seedFixtureForTriple({
      supabase,
      triple,
      identity,
    });
    perCurrency[triple.currency] = result;
    totalRows += result.rowCount;
  }

  return {
    totalRows,
    perCurrency: perCurrency as Record<
      SupportedCurrency,
      FixtureSeedPerCurrency
    >,
  };
}

async function seedFixtureForTriple({
  supabase,
  triple,
  identity,
}: {
  supabase: SupabaseClient;
  triple: EvalFixtureTriple;
  identity: EvalSeedIdentity;
}): Promise<FixtureSeedPerCurrency> {
  const fixture = readFixture(triple.fixturePath);
  const rows = fixture.rows.map(row => buildInsertRow(row, identity));

  // Wipe any leftover eval expenses (from a prior run or a crashed seed) so the
  // insert below is exact, not additive. Cascades only ever touch eval rows
  // since `household_id` is scoped to the eval household.
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('household_id', identity.householdId);
  if (deleteError) {
    throw new Error(
      `Failed to wipe eval expenses for ${triple.currency} (${identity.householdId}): ${deleteError.message}`,
    );
  }

  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
    const slice = rows.slice(offset, offset + INSERT_BATCH_SIZE);
    const { error } = await supabase.from('expenses').insert(slice);
    if (error) {
      throw new Error(
        `Failed to insert expenses for ${triple.currency} (batch starting at ${offset}): ${error.message}`,
      );
    }
  }

  return { rowCount: rows.length, referenceDate: fixture.metadata.endDate };
}

function readFixture(relativePath: string): GoldenFixture {
  const absPath = path.resolve(process.cwd(), relativePath);
  const raw = fs.readFileSync(absPath, 'utf8');
  return JSON.parse(raw) as GoldenFixture;
}

function buildInsertRow(row: GoldenRow, identity: EvalSeedIdentity) {
  const userId = mapPlaceholderUser(row.user_id, identity);
  const householdId = mapPlaceholderHousehold(row.household_id, identity);
  const tags = extractTagNgrams(row.note ?? '');

  return {
    user_id: userId,
    household_id: householdId,
    amount_cents: row.amount_cents,
    currency: row.currency,
    expense_date: row.expense_date,
    merchant: row.merchant,
    category: row.category,
    note: row.note,
    tags,
  };
}

function mapPlaceholderUser(
  placeholder: string,
  identity: EvalSeedIdentity,
): string {
  if (placeholder === PLACEHOLDER_OWNER) return identity.ownerId;
  if (placeholder === PLACEHOLDER_MEMBER) return identity.memberId;
  throw new Error(`Unrecognized user placeholder in fixture: ${placeholder}`);
}

function mapPlaceholderHousehold(
  placeholder: string | null,
  identity: EvalSeedIdentity,
): string | null {
  if (placeholder === null) return null;
  if (placeholder === PLACEHOLDER_HOUSEHOLD) return identity.householdId;
  throw new Error(
    `Unrecognized household placeholder in fixture: ${placeholder}`,
  );
}
