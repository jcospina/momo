'use server';

import { createSupabaseServerClient } from '@supabase/server';
import { redirect } from 'next/navigation';

import type { CreateHouseholdState } from '@lib-types/households';

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

  const { data: household, error: createError } = await supabase
    .from('households')
    .insert({
      name: name.trim(),
      owner: user.id,
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
      user_id: user.id,
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
      { user_id: user.id, onboarding_status: 'completed' },
      { onConflict: 'user_id' },
    );

  if (prefsError) {
    console.error('Mark onboarding completed failed', prefsError);
    return {
      error:
        prefsError.message ?? 'Could not finish onboarding. Please try again.',
    };
  }

  redirect('/home');
}
