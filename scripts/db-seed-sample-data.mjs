#!/usr/bin/env node

/**
 * Generates ~1 year of realistic expense & income data for a married couple
 * with kids. Assumes `pnpm db:seed` has already been applied (users, household,
 * profiles all exist).
 *
 * Usage:  pnpm db:seed:sample
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ── helpers shared with db-seed.mjs ──────────────────────────────────────────

function loadEnvFiles(files) {
  for (const file of files) {
    const absPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absPath)) continue;
    const raw = fs.readFileSync(absPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const withoutExport = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed;
      const eq = withoutExport.indexOf('=');
      if (eq < 1) continue;
      const key = withoutExport.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let value = withoutExport.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
        value = value.slice(1, -1);
      process.env[key] = value;
    }
  }
}

function mustGetEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function resolveServiceRoleKey() {
  try {
    const output = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const line = output
      .split(/\r?\n/)
      .find(l => l.startsWith('SERVICE_ROLE_KEY='));
    if (line) {
      let v = line.slice('SERVICE_ROLE_KEY='.length).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  return mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');
}

// ── config ───────────────────────────────────────────────────────────────────

loadEnvFiles(['.env.local', '.env']);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const serviceRoleKey = resolveServiceRoleKey();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OWNER_EMAIL = (
  process.env.MOMO_DEV_SEED_OWNER_EMAIL ?? 'dev.owner@momo.local'
).toLowerCase();
const MEMBER_EMAIL = (
  process.env.MOMO_DEV_SEED_MEMBER_EMAIL ?? 'dev.member@momo.local'
).toLowerCase();

const CURRENCY = 'USD';
const BATCH_SIZE = 200;

// Resolved in main() — mapping user_id → display name for chat sender_name.
const senderNames = new Map();
function senderNameFor(userId) {
  return senderNames.get(userId) ?? null;
}

// The year of data to generate: from exactly 12 months ago through today.
// e.g. if today is 2026-03-20 → range is 2025-03 through 2026-03 (13 months,
// with the current month capped at today's day).
const NOW = new Date();
const TODAY_YEAR = NOW.getFullYear();
const TODAY_MONTH = NOW.getMonth() + 1; // 1-indexed
const TODAY_DAY = NOW.getDate();
const END_YEAR = TODAY_YEAR;
const END_MONTH = TODAY_MONTH;
const START_YEAR = TODAY_MONTH === 12 ? TODAY_YEAR : TODAY_YEAR - 1;
const START_MONTH = TODAY_MONTH === 12 ? 1 : TODAY_MONTH;

// ── main ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n[db:seed:sample] Failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

async function main() {
  console.log('[db:seed:sample] Generating sample expense & income data...');

  const owner = await findUserByEmail(OWNER_EMAIL);
  if (!owner)
    throw new Error(
      `Owner user ${OWNER_EMAIL} not found — run pnpm db:seed first`,
    );
  const member = await findUserByEmail(MEMBER_EMAIL);
  if (!member)
    throw new Error(
      `Member user ${MEMBER_EMAIL} not found — run pnpm db:seed first`,
    );

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', owner.id)
    .single();
  if (!membership)
    throw new Error('Owner has no household — run pnpm db:seed first');
  const householdId = membership.household_id;

  senderNames.set(owner.id, displayNameOf(owner));
  senderNames.set(member.id, displayNameOf(member));

  console.log(`  owner:     ${owner.id} (${OWNER_EMAIL})`);
  console.log(`  member:    ${member.id} (${MEMBER_EMAIL})`);
  console.log(`  household: ${householdId}`);
  console.log(
    `  range:     ${START_YEAR}-${pad(START_MONTH)}-01 → ${END_YEAR}-${pad(END_MONTH)}-${pad(TODAY_DAY)}`,
  );

  const pairs = [];
  forEachMonth((year, month, maxDay) => {
    pairs.push(
      ...generateIncomeRows(
        year,
        month,
        owner.id,
        member.id,
        householdId,
        maxDay,
      ),
    );
    pairs.push(
      ...generateExpenseRows(
        year,
        month,
        owner.id,
        member.id,
        householdId,
        maxDay,
      ),
    );
  });

  console.log(`  total rows: ${pairs.length}`);

  // Insert chat messages first (in order) so we can link expenses back via chat_message_id.
  const messageIds = [];
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE).map(p => p.message);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(batch)
      .select('id');
    if (error)
      throw new Error(`Message insert failed at batch ${i}: ${error.message}`);
    if (!data || data.length !== batch.length)
      throw new Error(
        `Message insert returned ${data?.length ?? 0} ids for batch of ${batch.length}`,
      );
    for (const row of data) messageIds.push(row.id);
  }

  // Insert expenses with the matching chat_message_id.
  let inserted = 0;
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE).map((p, j) => ({
      ...p.expense,
      chat_message_id: messageIds[i + j],
    }));
    const { error } = await supabase.from('expenses').insert(batch);
    if (error) throw new Error(`Insert failed at batch ${i}: ${error.message}`);
    inserted += batch.length;
  }

  console.log(
    `[db:seed:sample] Done — inserted ${messageIds.length} chat messages and ${inserted} expenses.`,
  );
}

function displayNameOf(user) {
  return (
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email ??
    null
  );
}

// ── user lookup ──────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
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

// ── iteration helper ─────────────────────────────────────────────────────────

function forEachMonth(fn) {
  let y = START_YEAR;
  let m = START_MONTH;
  for (let i = 0; i < 13; i++) {
    // For the current month, cap at today's day; past months use full range.
    const maxDay = y === END_YEAR && m === END_MONTH ? TODAY_DAY : null;
    fn(y, m, maxDay);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
}

// ── income generation ────────────────────────────────────────────────────────

function generateIncomeRows(
  year,
  month,
  ownerId,
  memberId,
  householdId,
  maxDay,
) {
  const rows = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  // Clamp day to month length and, for the current month, to today.
  const d = day => Math.min(day, maxDay ?? daysInMonth);
  const dayInRange = day => (maxDay ? day <= maxDay : true);

  // Candidate income entries: [day, userId, amountCents, merchant, note, monthGuard]
  // monthGuard is null (every month) or a specific month number.
  const candidates = [
    // Owner salary: $7,500/mo paid on 1st and 15th ($3,750 each)
    [1, ownerId, 375000, 'Acme Corp', 'Salary', null],
    [15, ownerId, 375000, 'Acme Corp', 'Salary', null],
    // Member salary: $5,500/mo paid on 1st and 15th ($2,750 each)
    [1, memberId, 275000, 'Globex Inc', 'Salary', null],
    [15, memberId, 275000, 'Globex Inc', 'Salary', null],
    // Occasional bonuses & one-offs
    [18, ownerId, 320000, 'IRS', 'Tax refund', 3],
    [28, ownerId, 500000, 'Acme Corp', 'Mid-year bonus', 6],
    [20, ownerId, 750000, 'Acme Corp', 'Year-end bonus', 12],
    [20, memberId, 400000, 'Globex Inc', 'Year-end bonus', 12],
    [12, memberId, 45000, 'Facebook Marketplace', 'Sold old couch', 7],
    [22, ownerId, 150000, 'Side project client', 'Freelance web dev', 9],
  ];

  for (const [day, userId, amount, merchant, note, guard] of candidates) {
    if (guard !== null && month !== guard) continue;
    if (!dayInRange(day)) continue;
    rows.push(
      incomeRow(
        userId,
        householdId,
        year,
        month,
        d(day),
        amount,
        merchant,
        note,
      ),
    );
  }

  return rows;
}

function incomeRow(
  userId,
  householdId,
  year,
  month,
  day,
  amountCents,
  merchant,
  note,
) {
  const expense = {
    user_id: userId,
    household_id: householdId,
    amount_cents: amountCents,
    currency: CURRENCY,
    expense_date: dateStr(year, month, day),
    merchant,
    category: 'income',
    note,
    tags: [],
  };
  const message = buildChatMessage({
    userId,
    householdId,
    year,
    month,
    day,
    amountCents,
    note,
    merchant,
    category: 'income',
  });
  return { message, expense };
}

// ── expense generation ───────────────────────────────────────────────────────

function generateExpenseRows(
  year,
  month,
  ownerId,
  memberId,
  householdId,
  maxDay,
) {
  const rows = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const cap = maxDay ?? daysInMonth;

  // Helper to clamp day to month length and current-month cap.
  const d = day => Math.min(day, cap);
  // For random ranges, limit upper bound to cap.
  const randDay = (min, max) => randInt(Math.min(min, cap), Math.min(max, cap));

  // ── Housing ────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      1,
      200000,
      'housing',
      'Mortgage payment',
      'First National Bank',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      1,
      35000,
      'housing',
      'HOA dues',
      'Sunrise HOA',
    ),
  );
  // Property tax twice a year
  if (month === 4 || month === 10) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        5,
        185000,
        'housing',
        'Property tax',
        'County Tax Office',
      ),
    );
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  // Electricity varies by season
  const elecBase =
    [1, 2, 3].includes(month) || [11, 12].includes(month) ? 18500 : 14000;
  const elec = vary(elecBase, 0.15);
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(5),
      elec,
      'utilities',
      'Electricity',
      'City Power Co',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(8),
      vary(6500, 0.1),
      'utilities',
      'Water & sewer',
      'City Water',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(10),
      vary(7500, 0.15),
      'utilities',
      'Natural gas',
      'Gas Utility',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(12),
      7999,
      'utilities',
      'Internet',
      'Comcast',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(12),
      5500,
      'utilities',
      'Cell phone plan',
      'T-Mobile',
    ),
  );

  // ── Groceries (4-6 trips/month, split between both) ───────────────────────
  const groceryTrips = randInt(4, 6);
  for (let t = 0; t < groceryTrips; t++) {
    const who = t % 2 === 0 ? ownerId : memberId;
    const store = pick([
      'Costco',
      "Trader Joe's",
      'Whole Foods',
      'Kroger',
      'Aldi',
    ]);
    const amt = store === 'Costco' ? vary(25000, 0.25) : vary(12000, 0.3);
    const dayOfMonth = d(
      Math.max(1, Math.round(((t + 1) / (groceryTrips + 1)) * cap)),
    );
    rows.push(
      expense(
        who,
        householdId,
        year,
        month,
        dayOfMonth,
        amt,
        'groceries',
        null,
        store,
      ),
    );
  }

  // ── Dining (3-6 times/month) ───────────────────────────────────────────────
  const diningTrips = randInt(3, 6);
  const restaurants = [
    'Chipotle',
    'Olive Garden',
    'Panera Bread',
    'Chick-fil-A',
    'Starbucks',
    'Local Pizza Place',
    'Thai Orchid',
    'Sushi Zen',
    "McDonald's",
    'In-N-Out',
    "Denny's",
    'Buffalo Wild Wings',
  ];
  for (let t = 0; t < diningTrips; t++) {
    const who = pick([ownerId, memberId]);
    const rest = pick(restaurants);
    const isFast = [
      'Chipotle',
      'Chick-fil-A',
      'Starbucks',
      "McDonald's",
      'In-N-Out',
    ].includes(rest);
    const amt = isFast ? vary(1800, 0.4) : vary(5500, 0.35);
    rows.push(
      expense(
        who,
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        amt,
        'dining',
        null,
        rest,
      ),
    );
  }

  // ── Transportation ────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(randDay(5, 12)),
      vary(5500, 0.2),
      'transportation',
      'Gas fill-up',
      'Shell',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(randDay(18, 25)),
      vary(5200, 0.2),
      'transportation',
      'Gas fill-up',
      'Chevron',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(randDay(8, 15)),
      vary(4800, 0.2),
      'transportation',
      'Gas fill-up',
      'BP',
    ),
  );
  // Occasional Uber/Lyft
  if (randInt(1, 3) === 1) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        vary(2500, 0.4),
        'transportation',
        null,
        'Uber',
      ),
    );
  }

  // ── Vehicle ────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(3),
      45000,
      'vehicle',
      'Car payment — SUV',
      'Auto Lender',
    ),
  );
  // Insurance quarterly
  if (month % 3 === 1) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(15),
        48000,
        'vehicle',
        'Auto insurance (quarterly)',
        'Geico',
      ),
    );
  }
  // Oil change every 3 months
  if (month % 3 === 0) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        7500,
        'vehicle',
        'Oil change',
        'Jiffy Lube',
      ),
    );
  }
  // Random car maintenance
  if (month === 8) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        14,
        65000,
        'vehicle',
        'New tires (set of 4)',
        'Discount Tire',
      ),
    );
  }
  if (month === 2) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        22,
        42000,
        'vehicle',
        'Brake pads + labor',
        'Midas',
      ),
    );
  }

  // ── Health ─────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      1,
      45000,
      'health',
      'Family health insurance premium',
      'Blue Cross',
    ),
  );
  // Doctor visits scattered
  if (randInt(1, 3) === 1) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(5, 25)),
        vary(4000, 0.3),
        'health',
        'Doctor copay',
        'Family Health Clinic',
      ),
    );
  }
  // Dentist twice a year
  if (month === 3 || month === 9) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(15),
        7500,
        'health',
        'Dental cleaning — adult',
        'Smile Dental',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(16),
        7500,
        'health',
        'Dental cleaning — adult',
        'Smile Dental',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(17),
        5000,
        'health',
        'Dental cleaning — kids',
        'Smile Dental',
      ),
    );
  }
  // Pharmacy
  if (randInt(1, 2) === 1) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        vary(2500, 0.5),
        'health',
        'Prescription',
        'CVS Pharmacy',
      ),
    );
  }

  // ── Kids ───────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      1,
      120000,
      'kids',
      'Daycare tuition',
      'Bright Horizons',
    ),
  );
  // After-school activity
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      1,
      15000,
      'kids',
      'Soccer league',
      'Youth Sports Assoc',
    ),
  );
  // School supplies / random kid stuff
  if (month === 8) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(10),
        18500,
        'kids',
        'Back-to-school supplies',
        'Target',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(12),
        32000,
        'kids',
        'School clothes',
        'Old Navy',
      ),
    );
  }
  // Birthday party
  if (month === 5) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(20),
        35000,
        'kids',
        'Birthday party',
        'Party City + venue',
      ),
    );
  }

  // ── Education ──────────────────────────────────────────────────────────────
  if (randInt(1, 4) === 1) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(randDay(5, 25)),
        vary(3000, 0.3),
        'education',
        'Online course',
        'Udemy',
      ),
    );
  }
  // Piano lessons monthly
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(8),
      16000,
      'education',
      'Piano lessons (kids)',
      'Music Academy',
    ),
  );

  // ── Subscriptions ──────────────────────────────────────────────────────────
  rows.push(
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(1),
      1599,
      'subscriptions',
      'Netflix',
      'Netflix',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(1),
      1099,
      'subscriptions',
      'Spotify Family',
      'Spotify',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(1),
      1499,
      'subscriptions',
      'iCloud+ storage',
      'Apple',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(5),
      4999,
      'subscriptions',
      'Gym membership',
      'LA Fitness',
    ),
    expense(
      ownerId,
      householdId,
      year,
      month,
      d(15),
      999,
      'subscriptions',
      'YouTube Premium',
      'Google',
    ),
    expense(
      memberId,
      householdId,
      year,
      month,
      d(20),
      1599,
      'subscriptions',
      'Disney+',
      'Disney',
    ),
  );
  // Amazon Prime annually
  if (month === 1) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(28),
        13900,
        'subscriptions',
        'Amazon Prime (annual)',
        'Amazon',
      ),
    );
  }

  // ── Entertainment ──────────────────────────────────────────────────────────
  const entCount = randInt(1, 3);
  const entOptions = [
    { merchant: 'AMC Theaters', note: 'Movie night', base: 5000 },
    { merchant: "Dave & Buster's", note: 'Family game night', base: 7500 },
    { merchant: 'Bowling Alley', note: 'Bowling', base: 4500 },
    { merchant: 'Mini Golf World', note: 'Mini golf with kids', base: 3500 },
    { merchant: 'Escape Room', note: 'Escape room', base: 9000 },
    { merchant: 'Zoo', note: 'Zoo visit', base: 6000 },
    { merchant: 'Aquarium', note: 'Aquarium tickets', base: 8000 },
    { merchant: 'Trampoline Park', note: 'Kids trampoline park', base: 4500 },
  ];
  for (let t = 0; t < entCount; t++) {
    const e = pick(entOptions);
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        vary(e.base, 0.2),
        'entertainment',
        e.note,
        e.merchant,
      ),
    );
  }

  // ── Shopping ───────────────────────────────────────────────────────────────
  const shopCount = randInt(1, 4);
  const shopOptions = [
    { merchant: 'Amazon', note: 'Household items', base: 4500 },
    { merchant: 'Target', note: null, base: 6500 },
    { merchant: 'IKEA', note: 'Home decor', base: 8000 },
    { merchant: 'Home Depot', note: 'Home improvement', base: 7000 },
    { merchant: 'TJ Maxx', note: 'Clothes', base: 5500 },
    { merchant: 'Best Buy', note: 'Electronics', base: 12000 },
    { merchant: 'Walmart', note: null, base: 3500 },
    { merchant: 'Nordstrom Rack', note: 'Clothes', base: 8500 },
  ];
  for (let t = 0; t < shopCount; t++) {
    const s = pick(shopOptions);
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(1, cap)),
        vary(s.base, 0.35),
        'shopping',
        s.note,
        s.merchant,
      ),
    );
  }

  // ── Self care ──────────────────────────────────────────────────────────────
  // Haircuts
  if (month % 2 === 0) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        3500,
        'self_care',
        'Haircut',
        'Great Clips',
      ),
    );
  }
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(randDay(5, 25)),
      vary(7500, 0.2),
      'self_care',
      'Hair salon',
      'Salon Luxe',
    ),
  );

  // ── Gifts ──────────────────────────────────────────────────────────────────
  if (month === 12) {
    // Holiday gifts
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(15),
        45000,
        'gifts',
        'Holiday gifts — family',
        'Various',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(16),
        38000,
        'gifts',
        'Holiday gifts — friends & teachers',
        'Various',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(10),
        12000,
        'gifts',
        'Holiday gift — spouse',
        'Nordstrom',
      ),
    );
  }
  if (month === 2) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(14),
        15000,
        'gifts',
        "Valentine's Day dinner + flowers",
        'Various',
      ),
    );
  }
  if (month === 5) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(11),
        8500,
        'gifts',
        "Mother's Day gift",
        'Etsy',
      ),
    );
  }
  if (month === 6) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(15),
        7500,
        'gifts',
        "Father's Day gift",
        'REI',
      ),
    );
  }
  // Random birthday gifts
  if (month === 4 || month === 10) {
    rows.push(
      expense(
        pick([ownerId, memberId]),
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        vary(5000, 0.3),
        'gifts',
        'Birthday gift — friend',
        pick(['Amazon', 'Etsy', 'Target']),
      ),
    );
  }

  // ── Pets ───────────────────────────────────────────────────────────────────
  rows.push(
    expense(
      memberId,
      householdId,
      year,
      month,
      d(randDay(1, 15)),
      vary(5500, 0.15),
      'pets',
      'Dog food & treats',
      'PetSmart',
    ),
  );
  // Vet visits twice a year
  if (month === 4 || month === 10) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(20),
        vary(25000, 0.2),
        'pets',
        'Vet checkup + vaccines',
        'Happy Paws Vet',
      ),
    );
  }
  // Grooming every 2 months
  if (month % 2 === 1) {
    rows.push(
      expense(
        memberId,
        householdId,
        year,
        month,
        d(randDay(10, 20)),
        6500,
        'pets',
        'Dog grooming',
        'PetSmart',
      ),
    );
  }

  // ── Fees ───────────────────────────────────────────────────────────────────
  if (month % 3 === 0) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(28),
        1500,
        'fees',
        'ATM fee',
        'Out-of-network ATM',
      ),
    );
  }

  // ── Travel (seasonal) ─────────────────────────────────────────────────────
  if (month === 7) {
    // Summer vacation
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        1,
        85000,
        'travel',
        'Flight tickets (family)',
        'Delta Airlines',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        5,
        120000,
        'travel',
        'Hotel — beach resort (5 nights)',
        'Marriott',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        6,
        15000,
        'travel',
        'Rental car',
        'Enterprise',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        7,
        8500,
        'travel',
        'Beach excursion',
        'Local Tours',
      ),
      expense(
        ownerId,
        householdId,
        year,
        month,
        8,
        22000,
        'travel',
        'Vacation dining',
        'Various restaurants',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        6,
        6500,
        'travel',
        'Souvenirs',
        'Gift shop',
      ),
    );
  }
  if (month === 11) {
    // Thanksgiving travel
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(22),
        42000,
        'travel',
        'Flight tickets — Thanksgiving',
        'Southwest Airlines',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(23),
        18000,
        'travel',
        'Rental car — Thanksgiving',
        'Hertz',
      ),
    );
  }
  // Weekend getaway
  if (month === 4) {
    rows.push(
      expense(
        ownerId,
        householdId,
        year,
        month,
        d(18),
        25000,
        'travel',
        'Cabin rental (weekend)',
        'Airbnb',
      ),
      expense(
        memberId,
        householdId,
        year,
        month,
        d(18),
        4500,
        'travel',
        'Gas for road trip',
        'Shell',
      ),
    );
  }

  return rows;
}

// ── row builder ──────────────────────────────────────────────────────────────

function expense(
  userId,
  householdId,
  year,
  month,
  day,
  amountCents,
  category,
  note,
  merchant,
) {
  const expenseRow = {
    user_id: userId,
    household_id: householdId,
    amount_cents: amountCents,
    currency: CURRENCY,
    expense_date: dateStr(year, month, day),
    merchant: merchant ?? null,
    category,
    note: note ?? null,
    tags: [],
  };
  const message = buildChatMessage({
    userId,
    householdId,
    year,
    month,
    day,
    amountCents,
    note: note ?? null,
    merchant: merchant ?? null,
    category,
  });
  return { message, expense: expenseRow };
}

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
}) {
  const label = (note ?? merchant ?? category ?? '').toLowerCase().trim();
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

function formatAmount(cents) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

function timestampForDay(year, month, day) {
  const hour = randInt(8, 22);
  const minute = randInt(0, 59);
  const second = randInt(0, 59);
  return new Date(year, month - 1, day, hour, minute, second).toISOString();
}

// ── utils ────────────────────────────────────────────────────────────────────

function dateStr(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Vary an amount by ±pct (returns integer cents). */
function vary(base, pct) {
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  return Math.round(base * factor);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
