#!/usr/bin/env tsx

import {
  createClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { getLocalSupabaseEnv } from './lib/supabase-env';

// ─────────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────────

const NON_EXISTING_ROW_CODE = 'PGRST116';
const USERS_PAGE_SIZE = 200;
const HOUSEHOLD_DATA_TABLES = ['expenses', 'chat_messages', 'category_rules'];

const DEFAULT_SEED = {
  ownerEmail: 'owner@momo.local',
  ownerName: 'Owner',
  memberEmail: 'member@momo.local',
  memberName: 'Member',
  householdName: 'Dev Household',
} as const;

type SeedUser = {
  email: string;
  password: string | undefined;
  displayName: string;
};

type SeedConfig = {
  supabase: SupabaseClient;
  owner: SeedUser;
  member: SeedUser;
  householdName: string;
  createMissingUsers: boolean;
};

type EnsureUserResult = {
  user: User;
  created: boolean;
};

type MembershipResult = {
  inserted: boolean;
  message: string;
};

type CleanupResult = {
  table: string;
  deleted: number;
};

// ─────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────

main().catch(error => {
  console.error('\n[db:seed] Seed failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

/**
 * Orchestrate the seed: ensure auth identities exist, verify profiles and
 * prefs, resolve the dev household, wipe household-scoped data tables, and
 * reassert memberships. Designed to be safely re-run without resetting the
 * database — repeated calls yield the same identities and IDs.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  console.log('[db:seed] Seeding local Supabase data...');
  console.log(
    `[db:seed] auth user mode: ${
      config.createMissingUsers ? 'create-if-missing' : 'must-exist'
    }`,
  );

  const ownerResult = await ensureUser(
    config.supabase,
    config.owner,
    config.createMissingUsers,
  );
  const memberResult = await ensureUser(
    config.supabase,
    config.member,
    config.createMissingUsers,
  );

  await upsertUserProfile(config.supabase, ownerResult.user.id, config.owner);
  await upsertUserPrefs(config.supabase, ownerResult.user.id);
  await upsertUserProfile(config.supabase, memberResult.user.id, config.member);
  await upsertUserPrefs(config.supabase, memberResult.user.id);

  const householdId = await ensureHousehold(config.supabase, {
    ownerId: ownerResult.user.id,
    householdName: config.householdName,
  });

  const cleaned = await cleanHouseholdData(config.supabase, householdId);

  const ownerMembership = await ensureMembership(config.supabase, {
    householdId,
    userId: ownerResult.user.id,
    role: 'owner',
  });
  const memberMembership = await ensureMembership(config.supabase, {
    householdId,
    userId: memberResult.user.id,
    role: 'member',
  });

  logSummary({
    config,
    householdId,
    ownerResult,
    memberResult,
    ownerMembership,
    memberMembership,
    cleaned,
  });
}

// ─────────────────────────────────────────────────────────────────
// Config loading
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve Supabase config + seed-user/household settings from env vars (with
 * defaults), and construct the admin client.
 */
function loadConfig(): SeedConfig {
  const { url, serviceRoleKey } = getLocalSupabaseEnv();
  const supabase = createAdminClient(url, serviceRoleKey);

  const owner = readSeedUserFromEnv(
    'OWNER',
    DEFAULT_SEED.ownerEmail,
    DEFAULT_SEED.ownerName,
  );
  const member = readSeedUserFromEnv(
    'MEMBER',
    DEFAULT_SEED.memberEmail,
    DEFAULT_SEED.memberName,
  );
  const householdName =
    process.env.MOMO_DEV_SEED_HOUSEHOLD_NAME ?? DEFAULT_SEED.householdName;
  const createMissingUsers = parseBooleanEnv(
    'MOMO_DEV_SEED_CREATE_MISSING_USERS',
    false,
  );

  return { supabase, owner, member, householdName, createMissingUsers };
}

/** Build a service-role Supabase client suitable for admin operations. */
function createAdminClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Read a seed user (email/password/displayName) from `MOMO_DEV_SEED_<ROLE>_*`
 * env vars, falling back to the shared `MOMO_DEV_SEED_PASSWORD` and defaults.
 */
function readSeedUserFromEnv(
  role: 'OWNER' | 'MEMBER',
  defaultEmail: string,
  defaultName: string,
): SeedUser {
  return {
    email: process.env[`MOMO_DEV_SEED_${role}_EMAIL`] ?? defaultEmail,
    password:
      process.env[`MOMO_DEV_SEED_${role}_PASSWORD`] ??
      process.env.MOMO_DEV_SEED_PASSWORD,
    displayName: process.env[`MOMO_DEV_SEED_${role}_NAME`] ?? defaultName,
  };
}

// ─────────────────────────────────────────────────────────────────
// Env helpers
// ─────────────────────────────────────────────────────────────────

/** Parse a boolean env var. Accepts true/false, 1/0, yes/no (case-insensitive). */
function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  throw new Error(
    `Invalid ${name} value "${value}". Use true/false (or 1/0, yes/no).`,
  );
}

// ─────────────────────────────────────────────────────────────────
// Auth user helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Find an existing auth user by email, or create one when bootstrap is enabled.
 * Skips creation when `createMissingUsers` is false — that's the recommended
 * Google-only workflow.
 */
async function ensureUser(
  supabase: SupabaseClient,
  seedUser: SeedUser,
  createMissingUsers: boolean,
): Promise<EnsureUserResult> {
  const existing = await findUserByEmail(supabase, seedUser.email);
  if (existing) {
    return { user: existing, created: false };
  }

  if (!createMissingUsers) {
    throw new Error(
      [
        `Missing auth user ${seedUser.email}.`,
        'Seed expects users to already exist (recommended for Google-only login).',
        'Sign in once via Google with that email, then run pnpm db:seed again.',
        'Or set MOMO_DEV_SEED_CREATE_MISSING_USERS=true to bootstrap email/password users.',
      ].join(' '),
    );
  }

  return createAuthUser(supabase, seedUser);
}

/**
 * Create a new auth user via the Supabase admin API. Handles the
 * duplicate-email race (another caller created the user mid-flight) by
 * re-looking up the email instead of failing.
 */
async function createAuthUser(
  supabase: SupabaseClient,
  seedUser: SeedUser,
): Promise<EnsureUserResult> {
  const effectivePassword =
    seedUser.password ?? `momo-dev-${crypto.randomUUID()}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedUser.email,
    password: effectivePassword,
    email_confirm: true,
    user_metadata: { name: seedUser.displayName },
  });

  if (error) {
    const duplicate = /already|duplicate/i.test(error.message ?? '');
    if (duplicate) {
      const user = await findUserByEmail(supabase, seedUser.email);
      if (user) return { user, created: false };
    }

    throw new Error(
      `Failed to create user ${seedUser.email}: ${error.message}`,
    );
  }

  if (!data.user) {
    throw new Error(`Supabase returned no user for ${seedUser.email}`);
  }

  return { user: data.user, created: true };
}

/** Paginate `auth.admin.listUsers` to find a user by email (case-insensitive). */
async function findUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const users = data?.users ?? [];
    const found = users.find(user => user.email?.toLowerCase() === target);
    if (found) return found;
    if (users.length < USERS_PAGE_SIZE) return null;

    page += 1;
  }
}

// ─────────────────────────────────────────────────────────────────
// Profile + prefs helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Verify (or set) the user_profiles row for an auth user. Idempotent via
 * `onConflict: 'user_id'`.
 */
async function upsertUserProfile(
  supabase: SupabaseClient,
  userId: string,
  seedUser: SeedUser,
): Promise<void> {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      display_name: seedUser.displayName,
      email: seedUser.email,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(
      `Failed to upsert user_profiles for ${seedUser.email}: ${error.message}`,
    );
  }
}

/**
 * Verify (or set) the user_prefs row for an auth user with dev defaults
 * (onboarding complete, USD/en, AI enabled). Idempotent via
 * `onConflict: 'user_id'`.
 */
async function upsertUserPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('user_prefs').upsert(
    {
      user_id: userId,
      onboarding_status: 'completed',
      currency: 'USD',
      language: 'en',
      ai_enabled: true,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(
      `Failed to upsert user_prefs for ${userId}: ${error.message}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Household helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Resolve the dev household ID. Reuses an existing household if the owner is
 * already a member of one, or owns one by direct lookup; otherwise creates a
 * new household. Stable across re-runs.
 */
async function ensureHousehold(
  supabase: SupabaseClient,
  { ownerId, householdName }: { ownerId: string; householdName: string },
): Promise<string> {
  const ownerMembership = await getMembership(supabase, ownerId);
  if (ownerMembership?.household_id) {
    return ownerMembership.household_id;
  }

  const { data: ownedHouseholds, error: ownedError } = await supabase
    .from('households')
    .select('id')
    .eq('owner', ownerId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (ownedError) {
    throw new Error(`Failed to query owner household: ${ownedError.message}`);
  }

  if (ownedHouseholds && ownedHouseholds.length > 0) {
    return ownedHouseholds[0].id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('households')
    .insert({ name: householdName, owner: ownerId })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create household "${householdName}": ${insertError?.message ?? 'unknown error'}`,
    );
  }

  return inserted.id as string;
}

/**
 * Ensure a user is in the given household with the given role. If they're
 * already in a different household, leave them alone. If already in this
 * household, update their role only.
 */
async function ensureMembership(
  supabase: SupabaseClient,
  {
    householdId,
    userId,
    role,
  }: { householdId: string; userId: string; role: 'owner' | 'member' },
): Promise<MembershipResult> {
  const existing = await getMembership(supabase, userId);
  if (existing?.household_id && existing.household_id !== householdId) {
    return {
      inserted: false,
      message: `already in household ${existing.household_id}, skipped`,
    };
  }

  if (existing?.household_id === householdId) {
    const { error: roleError } = await supabase
      .from('household_members')
      .update({ role })
      .eq('household_id', householdId)
      .eq('user_id', userId);

    if (roleError) {
      throw new Error(`Failed to update household role: ${roleError.message}`);
    }

    return { inserted: false, message: 'membership already existed' };
  }

  const { error: insertError } = await supabase
    .from('household_members')
    .insert({ household_id: householdId, user_id: userId, role });

  if (insertError) {
    throw new Error(
      `Failed to insert household membership: ${insertError.message}`,
    );
  }

  return { inserted: true, message: 'membership inserted' };
}

/** Look up the household membership row for a user, if any. */
async function getMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ household_id: string } | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== NON_EXISTING_ROW_CODE) {
    throw new Error(`Failed to query household_members: ${error.message}`);
  }

  return (data as { household_id: string } | null) ?? null;
}

// ─────────────────────────────────────────────────────────────────
// Household-scoped cleanup
// ─────────────────────────────────────────────────────────────────

/**
 * Delete rows tied to a household from the data tables that accumulate
 * per-run state (expenses, chat_messages, category_rules). Identity rows
 * (household, memberships, profiles, prefs) are preserved and re-upserted,
 * while transactional/sample data is wiped.
 */
async function cleanHouseholdData(
  supabase: SupabaseClient,
  householdId: string,
): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];
  for (const table of HOUSEHOLD_DATA_TABLES) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('household_id', householdId);

    if (error) {
      throw new Error(`Failed to clean ${table}: ${error.message}`);
    }

    results.push({ table, deleted: count ?? 0 });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────

function logSummary({
  config,
  householdId,
  ownerResult,
  memberResult,
  ownerMembership,
  memberMembership,
  cleaned,
}: {
  config: SeedConfig;
  householdId: string;
  ownerResult: EnsureUserResult;
  memberResult: EnsureUserResult;
  ownerMembership: MembershipResult;
  memberMembership: MembershipResult;
  cleaned: CleanupResult[];
}): void {
  console.log('\n[db:seed] Done');
  console.log(`household_id: ${householdId}`);
  console.log(
    `owner: ${config.owner.email} (${ownerMembership.message}) | member: ${config.member.email} (${memberMembership.message})`,
  );
  console.log(
    `auth users: owner ${ownerResult.created ? 'created' : 'found'} | member ${memberResult.created ? 'created' : 'found'}`,
  );

  const cleanedSummary = cleaned.map(c => `${c.table}=${c.deleted}`).join(' ');
  console.log(`cleaned household-scoped rows: ${cleanedSummary}`);

  if (
    config.createMissingUsers &&
    (ownerResult.created || memberResult.created)
  ) {
    console.log('\nCreated auth users (email/password bootstrap)');
    console.log(
      `- ${config.owner.email} / ${config.owner.password ?? '(auto-generated random password)'}`,
    );
    console.log(
      `- ${config.member.email} / ${config.member.password ?? '(auto-generated random password)'}`,
    );
  }
  console.log('\nRun again any time with: pnpm db:seed');
}
