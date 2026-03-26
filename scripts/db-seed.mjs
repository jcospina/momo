#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const NON_EXISTING_ROW_CODE = 'PGRST116';
const USERS_PAGE_SIZE = 200;

const defaults = {
  ownerEmail: 'owner@momo.local',
  ownerName: 'Owner',
  memberEmail: 'member@momo.local',
  memberName: 'Member',
  householdName: 'Dev Household',
};

loadEnvFiles(['.env.local', '.env']);

const supabaseUrl = mustGetEnv('NEXT_PUBLIC_SUPABASE_URL');
assertLocalSupabaseUrl(supabaseUrl);
const serviceRoleKey = resolveServiceRoleKey();

const owner = {
  email: process.env.MOMO_DEV_SEED_OWNER_EMAIL ?? defaults.ownerEmail,
  password:
    process.env.MOMO_DEV_SEED_OWNER_PASSWORD ??
    process.env.MOMO_DEV_SEED_PASSWORD,
  displayName: process.env.MOMO_DEV_SEED_OWNER_NAME ?? defaults.ownerName,
};

const member = {
  email: process.env.MOMO_DEV_SEED_MEMBER_EMAIL ?? defaults.memberEmail,
  password:
    process.env.MOMO_DEV_SEED_MEMBER_PASSWORD ??
    process.env.MOMO_DEV_SEED_PASSWORD,
  displayName: process.env.MOMO_DEV_SEED_MEMBER_NAME ?? defaults.memberName,
};

const householdName =
  process.env.MOMO_DEV_SEED_HOUSEHOLD_NAME ?? defaults.householdName;
const createMissingUsers = parseBooleanEnv(
  'MOMO_DEV_SEED_CREATE_MISSING_USERS',
  false,
);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch(error => {
  console.error('\n[db:seed] Seed failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  console.log('[db:seed] Seeding local Supabase data...');
  console.log(
    `[db:seed] auth user mode: ${createMissingUsers ? 'create-if-missing' : 'must-exist'}`,
  );

  const ownerResult = await ensureUser(owner);
  const memberResult = await ensureUser(member);
  const ownerUser = ownerResult.user;
  const memberUser = memberResult.user;

  await upsertProfileAndPrefs(ownerUser.id, owner);
  await upsertProfileAndPrefs(memberUser.id, member);

  const householdId = await ensureHousehold({
    ownerId: ownerUser.id,
    householdName,
  });

  const ownerMembership = await ensureMembership({
    householdId,
    userId: ownerUser.id,
    role: 'owner',
  });
  const memberMembership = await ensureMembership({
    householdId,
    userId: memberUser.id,
    role: 'member',
  });

  console.log('\n[db:seed] Done');
  console.log(`household_id: ${householdId}`);
  console.log(
    `owner: ${owner.email} (${ownerMembership.message}) | member: ${member.email} (${memberMembership.message})`,
  );
  console.log(
    `auth users: owner ${ownerResult.created ? 'created' : 'found'} | member ${memberResult.created ? 'created' : 'found'}`,
  );
  if (createMissingUsers && (ownerResult.created || memberResult.created)) {
    console.log('\nCreated auth users (email/password bootstrap)');
    console.log(
      `- ${owner.email} / ${owner.password ?? '(auto-generated random password)'}`,
    );
    console.log(
      `- ${member.email} / ${member.password ?? '(auto-generated random password)'}`,
    );
  }
  console.log('\nRun again any time with: pnpm db:seed');
}

function mustGetEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing ${key}. Set it in the shell or .env.local/.env before running this command.`,
    );
  }
  return value;
}

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
      const equalsIndex = withoutExport.indexOf('=');
      if (equalsIndex < 1) continue;

      const key = withoutExport.slice(0, equalsIndex).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = withoutExport.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function assertLocalSupabaseUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${urlString}`);
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  if (!isLocalHost) {
    throw new Error(
      `Refusing to seed a non-local project (${parsed.origin}). Point NEXT_PUBLIC_SUPABASE_URL to local Supabase first.`,
    );
  }
}

function parseBooleanEnv(name, fallback) {
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

function resolveServiceRoleKey() {
  const fromStatus = readLocalSupabaseEnvVar('SERVICE_ROLE_KEY');
  if (fromStatus) {
    return fromStatus;
  }

  return mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function readLocalSupabaseEnvVar(name) {
  try {
    const output = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const line = output
      .split(/\r?\n/)
      .find(entry => entry.startsWith(`${name}=`));
    if (!line) return null;

    const value = line.slice(name.length + 1).trim();
    if (!value) return null;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
  } catch {
    return null;
  }
}

async function ensureUser({ email, password, displayName }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    return { user: existing, created: false };
  }

  if (!createMissingUsers) {
    throw new Error(
      [
        `Missing auth user ${email}.`,
        'Seed expects users to already exist (recommended for Google-only login).',
        'Sign in once via Google with that email, then run pnpm db:seed again.',
        'Or set MOMO_DEV_SEED_CREATE_MISSING_USERS=true to bootstrap email/password users.',
      ].join(' '),
    );
  }

  const effectivePassword = password ?? `momo-dev-${crypto.randomUUID()}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: effectivePassword,
    email_confirm: true,
    user_metadata: {
      name: displayName,
    },
  });

  if (error) {
    const duplicate = /already|duplicate/i.test(error.message ?? '');
    if (duplicate) {
      const user = await findUserByEmail(email);
      if (user) return { user, created: false };
    }

    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  if (!data.user) {
    throw new Error(`Supabase returned no user for ${email}`);
  }

  return { user: data.user, created: true };
}

async function findUserByEmail(email) {
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

async function upsertProfileAndPrefs(userId, seedUser) {
  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      display_name: seedUser.displayName,
      email: seedUser.email,
    },
    { onConflict: 'user_id' },
  );

  if (profileError) {
    throw new Error(
      `Failed to upsert user_profiles for ${seedUser.email}: ${profileError.message}`,
    );
  }

  const { error: prefsError } = await supabase.from('user_prefs').upsert(
    {
      user_id: userId,
      onboarding_status: 'completed',
      currency: 'USD',
      language: 'en',
      ai_enabled: true,
    },
    { onConflict: 'user_id' },
  );

  if (prefsError) {
    throw new Error(
      `Failed to upsert user_prefs for ${seedUser.email}: ${prefsError.message}`,
    );
  }
}

async function ensureHousehold({ ownerId, householdName }) {
  const ownerMembership = await getMembership(ownerId);
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
    return ownedHouseholds[0].id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('households')
    .insert({
      name: householdName,
      owner: ownerId,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create household "${householdName}": ${insertError?.message ?? 'unknown error'}`,
    );
  }

  return inserted.id;
}

async function ensureMembership({ householdId, userId, role }) {
  const existing = await getMembership(userId);
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

    return {
      inserted: false,
      message: 'membership already existed',
    };
  }

  const { error: insertError } = await supabase
    .from('household_members')
    .insert({
      household_id: householdId,
      user_id: userId,
      role,
    });

  if (insertError) {
    throw new Error(
      `Failed to insert household membership: ${insertError.message}`,
    );
  }

  return {
    inserted: true,
    message: 'membership inserted',
  };
}

async function getMembership(userId) {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== NON_EXISTING_ROW_CODE) {
    throw new Error(`Failed to query household_members: ${error.message}`);
  }

  return data ?? null;
}
