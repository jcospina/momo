import type { SupabaseClient } from '@supabase/supabase-js';

type FetchCategoryRulesParams = {
  supabase: SupabaseClient;
  userId: string;
  householdId: string | null;
  normalizedTexts: string[];
};

type UpsertCategoryRuleParams = {
  supabase: SupabaseClient;
  userId: string;
  householdId: string | null;
  normalizedText: string;
  category: string;
};

type CategoryRuleRow = {
  normalized_text: string;
  category: string;
};

function normalizeCategoryKeys(texts: string[]): string[] {
  return Array.from(
    new Set(
      texts.map(text => text?.trim()).filter((text): text is string => !!text),
    ),
  );
}

export async function fetchCategoryRules({
  supabase,
  userId,
  householdId,
  normalizedTexts,
}: FetchCategoryRulesParams): Promise<Map<string, string>> {
  const normalizedKeys = normalizeCategoryKeys(normalizedTexts);
  if (!normalizedKeys.length) {
    return new Map();
  }

  const trimmedHouseholdId = householdId?.trim() || null;

  let query = supabase
    .from('category_rules')
    .select('normalized_text, category')
    .in('normalized_text', normalizedKeys);

  if (trimmedHouseholdId) {
    query = query.eq('household_id', trimmedHouseholdId);
  } else {
    const trimmedUserId = userId?.trim();
    if (!trimmedUserId) {
      return new Map();
    }
    query = query.is('household_id', null).eq('user_id', trimmedUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('fetchCategoryRules failed', error);
    return new Map();
  }

  return ((data as CategoryRuleRow[] | null) ?? []).reduce((acc, row) => {
    const key = row.normalized_text?.trim();
    const category = row.category?.trim();
    if (key && category) {
      acc.set(key, category);
    }
    return acc;
  }, new Map<string, string>());
}

export async function upsertCategoryRule({
  supabase,
  userId,
  householdId,
  normalizedText,
  category,
}: UpsertCategoryRuleParams): Promise<void> {
  const trimmedUserId = userId?.trim();
  const trimmedKey = normalizedText?.trim();
  const trimmedCategory = category?.trim();

  if (!trimmedUserId || !trimmedKey || !trimmedCategory) {
    return;
  }

  const { error } = await supabase.rpc('upsert_category_rule', {
    p_user_id: trimmedUserId,
    p_household_id: householdId?.trim() || null,
    p_normalized_text: trimmedKey,
    p_category: trimmedCategory,
  });

  if (error) {
    console.warn('upsertCategoryRule failed', error);
  }
}
