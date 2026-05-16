#!/usr/bin/env tsx

/**
 * Seeds ~1 year of realistic expense & income data for a married couple with
 * kids. Assumes `pnpm db:seed` has already been applied (users, household,
 * profiles all exist).
 *
 * Data shape and randomness come from `scripts/sample-data-generator.ts`
 * (deterministic, seeded, with category drift + seasonality + one-off events
 * + ngram-derived tags). This script's job is the DB plumbing: resolve user
 * IDs from Supabase, build the paired chat_messages rows that "would have"
 * produced each expense, and run the two-phase insert. Merchant is nulled on
 * most rows here (post-tag-derivation) to mirror what the production chat
 * parser does — it never sets merchant; the agent fills it later.
 *
 * Usage:
 *   pnpm db:seed:sample
 *   MOMO_DEV_SEED_SAMPLE_NOW=2026-04-24 pnpm db:seed:sample
 *   MOMO_DEV_SEED_SAMPLE_SEED=20260424 pnpm db:seed:sample
 */

import { createClient, type User } from '@supabase/supabase-js';
import {
  getLocalSupabaseEnv,
  mustGetEnv,
  parseBooleanEnv,
} from './lib/supabase-env';
import {
  chatLabelFor,
  DEFAULT_SAMPLE_SEED,
  generateSampleExpenseData,
} from './sample-data-generator';

// ── config ───────────────────────────────────────────────────────────────────

const { url: supabaseUrl, serviceRoleKey } = getLocalSupabaseEnv();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_MODE = parseBooleanEnv('MOMO_DEMO_MODE', false);

const OWNER_EMAIL = (
  DEMO_MODE
    ? mustGetEnv('MOMO_DEMO_EMAIL')
    : (process.env.MOMO_DEV_SEED_OWNER_EMAIL ?? 'dev.owner@momo.local')
).toLowerCase();
const MEMBER_EMAIL = (
  DEMO_MODE
    ? (process.env.MOMO_DEMO_MEMBER_EMAIL ?? 'momo-demo-member@joq.dev')
    : (process.env.MOMO_DEV_SEED_MEMBER_EMAIL ?? 'dev.member@momo.local')
).toLowerCase();

const CURRENCY = 'USD';
const BATCH_SIZE = 200;
const MERCHANT_NULL_PROBABILITY = 0.85;

const SAMPLE_NOW =
  process.env.MOMO_DEV_SEED_SAMPLE_NOW ?? new Date().toISOString().slice(0, 10);
const SAMPLE_SEED = Number.parseInt(
  process.env.MOMO_DEV_SEED_SAMPLE_SEED ?? String(DEFAULT_SAMPLE_SEED),
  10,
);

const senderNames = new Map<string, string | null>();
function senderNameFor(userId: string): string | null {
  return senderNames.get(userId) ?? null;
}

// ── main ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n[db:seed:sample] Failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

async function main(): Promise<void> {
  console.log('[db:seed:sample] Generating sample expense & income data...');

  const owner = await findUserByEmail(OWNER_EMAIL);
  if (!owner) {
    throw new Error(
      `Owner user ${OWNER_EMAIL} not found — run pnpm db:seed first`,
    );
  }
  const member = await findUserByEmail(MEMBER_EMAIL);
  if (!member) {
    throw new Error(
      `Member user ${MEMBER_EMAIL} not found — run pnpm db:seed first`,
    );
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', owner.id)
    .single();
  if (!membership) {
    throw new Error('Owner has no household — run pnpm db:seed first');
  }
  const householdId = membership.household_id as string;

  senderNames.set(owner.id, displayNameOf(owner));
  senderNames.set(member.id, displayNameOf(member));

  const { metadata, rows } = generateSampleExpenseData({
    currency: CURRENCY,
    householdId,
    memberId: member.id,
    now: SAMPLE_NOW,
    ownerId: owner.id,
    seed: SAMPLE_SEED,
  });

  console.log(`  owner:     ${owner.id} (${OWNER_EMAIL})`);
  console.log(`  member:    ${member.id} (${MEMBER_EMAIL})`);
  console.log(`  household: ${householdId}`);
  console.log(`  now:       ${SAMPLE_NOW}`);
  console.log(`  seed:      ${SAMPLE_SEED}`);
  console.log(`  range:     ${metadata.startDate} → ${metadata.endDate}`);
  console.log(`  total rows: ${rows.length}`);

  const pairs = rows.map(row => {
    const [year, month, day] = row.expense_date.split('-').map(Number);
    const message = buildChatMessage({
      userId: row.user_id,
      householdId: row.household_id,
      year,
      month,
      day,
      amountCents: row.amount_cents,
      note: row.note,
      merchant: row.merchant,
      category: row.category,
    });
    const expenseRow = {
      ...row,
      merchant: maybeNullMerchant(row.merchant),
    };
    return { message, expense: expenseRow };
  });

  // Insert chat messages first (in order) so we can link expenses back via chat_message_id.
  const messageIds: string[] = [];
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE).map(p => p.message);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(batch)
      .select('id');
    if (error) {
      throw new Error(`Message insert failed at batch ${i}: ${error.message}`);
    }
    if (!data || data.length !== batch.length) {
      throw new Error(
        `Message insert returned ${data?.length ?? 0} ids for batch of ${batch.length}`,
      );
    }
    for (const row of data) messageIds.push(row.id as string);
  }

  // Insert expenses with the matching chat_message_id.
  let inserted = 0;
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE).map((p, j) => ({
      ...p.expense,
      chat_message_id: messageIds[i + j],
    }));
    const { error } = await supabase.from('expenses').insert(batch);
    if (error) {
      throw new Error(`Insert failed at batch ${i}: ${error.message}`);
    }
    inserted += batch.length;
  }

  console.log(
    `[db:seed:sample] Done — inserted ${messageIds.length} chat messages and ${inserted} expenses.`,
  );
}

function displayNameOf(user: User): string | null {
  const meta = user.user_metadata as
    | { name?: string; full_name?: string }
    | undefined;
  return meta?.name ?? meta?.full_name ?? user.email ?? null;
}

// ── user lookup ──────────────────────────────────────────────────────────────

async function findUserByEmail(email: string): Promise<User | null> {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const users = data?.users ?? [];
    const found = users.find(u => u.email?.toLowerCase() === email);
    if (found) return found;
    if (users.length < 200) return null;
    page++;
  }
}

// ── chat message scaffolding ─────────────────────────────────────────────────

type ChatMessageInput = {
  userId: string;
  householdId: string;
  year: number;
  month: number;
  day: number;
  amountCents: number;
  note: string | null;
  merchant: string | null;
  category: string | null;
};

// Build a chat_messages row that "would have" produced the paired expense.
// Content mirrors how a user types it in chat — e.g. "uber 25", "salary 3750".
function buildChatMessage({
  userId,
  householdId,
  year,
  month,
  day,
  amountCents,
  note,
  merchant,
  category,
}: ChatMessageInput) {
  const label = chatLabelFor({ note, merchant, category });
  const amount = formatAmount(amountCents);
  const content = label ? `${label} ${amount}` : amount;
  return {
    user_id: userId,
    household_id: householdId,
    content,
    status: 'processed',
    expense_count: 1,
    sender_name: senderNameFor(userId),
    created_at: timestampForDay(year, month, day),
  };
}

function formatAmount(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

function timestampForDay(year: number, month: number, day: number): string {
  const hour = randInt(8, 22);
  const minute = randInt(0, 59);
  const second = randInt(0, 59);
  return new Date(year, month - 1, day, hour, minute, second).toISOString();
}

// ── utils ────────────────────────────────────────────────────────────────────

function maybeNullMerchant(merchant: string | null): string | null {
  if (merchant == null) return null;
  return Math.random() < MERCHANT_NULL_PROBABILITY ? null : merchant;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
