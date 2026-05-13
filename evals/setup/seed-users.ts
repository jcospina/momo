import type {
  EvalFixtureTriple,
  EvalSeedIdentities,
  EvalSeedIdentity,
} from '@evals/types/setup';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { getLocalSupabaseEnv } from '@scripts/lib/supabase-env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EVAL_FIXTURE_TRIPLES, getEvalPassword } from './eval-fixtures';

export type { EvalSeedIdentities, EvalSeedIdentity } from '@evals/types/setup';

const USERS_PAGE_SIZE = 200;

/**
 * Creates one (owner, member, household) triple per currency, returning the
 * seeded UUIDs so the fixture inserter can substitute the placeholder IDs.
 *
 * Uses the Supabase service-role client to bypass RLS — admin user creation,
 * profile + prefs upserts, household + membership inserts.
 */
export async function seedEvalUsers(): Promise<EvalSeedIdentities> {
  const { url, serviceRoleKey } = getLocalSupabaseEnv();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const password = getEvalPassword();

  const identities: EvalSeedIdentities = new Map();

  for (const triple of EVAL_FIXTURE_TRIPLES) {
    const identity = await seedTriple({ supabase, triple, password });
    identities.set(triple.currency, identity);
  }

  return identities;
}

async function seedTriple({
  supabase,
  triple,
  password,
}: {
  supabase: SupabaseClient;
  triple: EvalFixtureTriple;
  password: string;
}): Promise<EvalSeedIdentity> {
  const owner = await ensureUser({
    supabase,
    email: triple.ownerEmail,
    password,
    displayName: triple.ownerDisplayName,
  });
  const member = await ensureUser({
    supabase,
    email: triple.memberEmail,
    password,
    displayName: triple.memberDisplayName,
  });

  await upsertProfileAndPrefs({
    supabase,
    userId: owner.id,
    email: triple.ownerEmail,
    displayName: triple.ownerDisplayName,
    currency: triple.currency,
  });
  await upsertProfileAndPrefs({
    supabase,
    userId: member.id,
    email: triple.memberEmail,
    displayName: triple.memberDisplayName,
    currency: triple.currency,
  });

  const householdId = await ensureHousehold({
    supabase,
    ownerId: owner.id,
    householdName: triple.householdName,
  });

  await ensureMembership({
    supabase,
    householdId,
    userId: owner.id,
    role: 'owner',
  });
  await ensureMembership({
    supabase,
    householdId,
    userId: member.id,
    role: 'member',
  });

  return { ownerId: owner.id, memberId: member.id, householdId };
}

async function ensureUser({
  supabase,
  email,
  password,
  displayName,
}: {
  supabase: SupabaseClient;
  email: string;
  password: string;
  displayName: string;
}): Promise<{ id: string }> {
  const existing = await findUserByEmail(supabase, email);
  if (existing) return { id: existing.id };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName },
  });

  if (error) {
    if (/already|duplicate/i.test(error.message ?? '')) {
      const retry = await findUserByEmail(supabase, email);
      if (retry) return { id: retry.id };
    }
    throw new Error(`Failed to create eval user ${email}: ${error.message}`);
  }

  if (!data.user) {
    throw new Error(`Supabase returned no user for ${email}`);
  }

  return { id: data.user.id };
}

async function findUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ id: string } | null> {
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
    if (found) return { id: found.id };
    if (users.length < USERS_PAGE_SIZE) return null;

    page += 1;
  }
}

async function upsertProfileAndPrefs({
  supabase,
  userId,
  email,
  displayName,
  currency,
}: {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  displayName: string;
  currency: SupportedCurrency;
}): Promise<void> {
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert(
      { user_id: userId, display_name: displayName, email },
      { onConflict: 'user_id' },
    );
  if (profileError) {
    throw new Error(
      `Failed to upsert user_profiles for ${email}: ${profileError.message}`,
    );
  }

  const { error: prefsError } = await supabase.from('user_prefs').upsert(
    {
      user_id: userId,
      onboarding_status: 'completed',
      currency,
      language: 'en',
      ai_enabled: true,
    },
    { onConflict: 'user_id' },
  );
  if (prefsError) {
    throw new Error(
      `Failed to upsert user_prefs for ${email}: ${prefsError.message}`,
    );
  }
}

async function ensureHousehold({
  supabase,
  ownerId,
  householdName,
}: {
  supabase: SupabaseClient;
  ownerId: string;
  householdName: string;
}): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from('households')
    .select('id')
    .eq('owner', ownerId)
    .eq('name', householdName)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Failed to look up household "${householdName}": ${lookupError.message}`,
    );
  }
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from('households')
    .insert({ name: householdName, owner: ownerId })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create household "${householdName}": ${error?.message ?? 'unknown error'}`,
    );
  }

  return data.id as string;
}

async function ensureMembership({
  supabase,
  householdId,
  userId,
  role,
}: {
  supabase: SupabaseClient;
  householdId: string;
  userId: string;
  role: 'owner' | 'member';
}): Promise<void> {
  const { error } = await supabase
    .from('household_members')
    .upsert(
      { household_id: householdId, user_id: userId, role },
      { onConflict: 'household_id,user_id' },
    );

  if (error) {
    throw new Error(
      `Failed to upsert household membership (${role}): ${error.message}`,
    );
  }
}
