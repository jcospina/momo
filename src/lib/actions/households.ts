'use server';

import { createSupabaseServerClient } from '@supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { CreateHouseholdState } from '@lib-types/households';

async function insertHousehold(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  name: string,
): Promise<CreateHouseholdState & { householdId?: string }> {
  const { data: household, error: createError } = await supabase
    .from('households')
    .insert({
      name,
      owner: userId,
    })
    .select('id')
    .single();

  if (createError || !household) {
    console.error('Create household failed', createError);
    return {
      error:
        createError?.message ??
        'Unable to create the household. Please try again.',
    };
  }

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    console.error('Create household membership failed', memberError);
    return {
      error:
        memberError.message ?? 'Could not finish onboarding. Please try again.',
    };
  }

  // mark onboarding as completed for this user
  const { error: prefsError } = await supabase
    .from('user_prefs')
    .upsert(
      { user_id: userId, onboarding_status: 'completed' },
      { onConflict: 'user_id' },
    );

  if (prefsError) {
    console.error('Mark onboarding completed failed', prefsError);
    return {
      error:
        prefsError.message ?? 'Could not finish onboarding. Please try again.',
    };
  }

  return { householdId: household.id };
}

export async function createHousehold(
  _prevState: CreateHouseholdState,
  formData: FormData,
): Promise<CreateHouseholdState> {
  const name = formData.get('name');
  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Please provide a household name.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const result = await insertHousehold(supabase, user.id, name.trim());
  if (result.error) {
    return { error: result.error };
  }

  redirect('/home');
}

export async function createHouseholdInline(
  _prevState: CreateHouseholdState,
  formData: FormData,
): Promise<CreateHouseholdState> {
  const name = formData.get('name');
  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Please provide a household name.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You need to be logged in.' };
  }

  const result = await insertHousehold(supabase, user.id, name.trim());
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/home/profile');

  return {};
}
