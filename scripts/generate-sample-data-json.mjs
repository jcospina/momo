#!/usr/bin/env node

/**
 * Writes generated sample expense & income data to JSON without touching DB.
 *
 * Usage:
 *   pnpm db:sample:json
 *   MOMO_DEV_SEED_SAMPLE_NOW=2026-04-24 MOMO_DEV_SEED_SAMPLE_JSON=tmp/sample.json pnpm db:sample:json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_SAMPLE_NOW,
  DEFAULT_SAMPLE_SEED,
  generateSampleExpenseData,
} from './sample-data-generator.mjs';

const outputPath =
  process.env.MOMO_DEV_SEED_SAMPLE_JSON ??
  'tmp/momo-sample-expenses.golden.json';
const sampleNow = process.env.MOMO_DEV_SEED_SAMPLE_NOW ?? DEFAULT_SAMPLE_NOW;
const sampleSeed = Number.parseInt(
  process.env.MOMO_DEV_SEED_SAMPLE_SEED ?? String(DEFAULT_SAMPLE_SEED),
  10,
);

main().catch(err => {
  console.error('\n[db:sample:json] Failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

async function main() {
  const dataset = generateSampleExpenseData({
    householdId: process.env.MOMO_DEV_SEED_HOUSEHOLD_ID ?? 'sample-household',
    memberId: process.env.MOMO_DEV_SEED_MEMBER_ID ?? 'sample-member',
    now: sampleNow,
    ownerId: process.env.MOMO_DEV_SEED_OWNER_ID ?? 'sample-owner',
    seed: sampleSeed,
  });

  const absPath = path.resolve(process.cwd(), outputPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log('[db:sample:json] Wrote sample expense data');
  console.log(`  file:      ${absPath}`);
  console.log(
    `  range:     ${dataset.metadata.startDate} -> ${dataset.metadata.endDate}`,
  );
  console.log(`  seed:      ${dataset.metadata.seed}`);
  console.log(`  total rows: ${dataset.rows.length}`);
}
