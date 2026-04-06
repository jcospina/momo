import { fetchCategoryRules } from '@helpers/expenses/category-rules';
import {
  buildCategoryKey,
  isExplicitIncomeEntry,
} from '@helpers/expenses/expense-category';
import { parseChatEntries } from '@helpers/expenses/expense-parser';
import {
  persistParsedExpenses,
  updateMessageStatus,
} from '@helpers/expenses/expense-persistence';
import { getUserPreferences } from '@helpers/user-prefs';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type { ChatMessage } from '@lib-types/chat';
import type { ParsedEntry } from '@lib-types/expenses';

function resolveEntryInput(entry: ParsedEntry): string {
  return entry.normalized || entry.raw;
}

async function applyLearnedRules(
  message: ChatMessage,
  entries: ParsedEntry[],
): Promise<ParsedEntry[]> {
  const normalizedTexts = entries.reduce<string[]>((acc, entry) => {
    const input = resolveEntryInput(entry);
    if (isExplicitIncomeEntry(input)) {
      return acc;
    }

    const key = buildCategoryKey(input);
    if (key) {
      acc.push(key);
    }
    return acc;
  }, []);

  if (!normalizedTexts.length) {
    return entries;
  }

  let rules = new Map<string, string>();
  try {
    const supabase = await createSupabaseServerClient();
    rules = await fetchCategoryRules({
      supabase,
      userId: message.user_id,
      householdId: message.household_id,
      normalizedTexts,
    });
  } catch (error) {
    console.warn('applyLearnedRules failed', error);
    return entries;
  }

  if (!rules.size) {
    return entries;
  }

  return entries.map(entry => {
    const input = resolveEntryInput(entry);
    if (isExplicitIncomeEntry(input)) {
      if (entry.category === 'income') {
        return entry;
      }
      return { ...entry, category: 'income' };
    }

    const key = buildCategoryKey(input);
    const learnedCategory = key ? rules.get(key) : null;
    if (!learnedCategory || entry.category === learnedCategory) {
      return entry;
    }

    return {
      ...entry,
      category: learnedCategory as ParsedEntry['category'],
    };
  });
}

/**
 * Placeholder processor for chat messages (text/images) before expense creation.
 * Intended to run asynchronously and never block message delivery.
 */
export async function processChatMessage(message: ChatMessage) {
  const prefs = await getUserPreferences(message.user_id);
  const currency = prefs?.currency ?? 'USD';
  const result = parseChatEntries(message.content, currency);
  if (result.status !== 'parsed') {
    if (result.status === 'no_expense') {
      await updateMessageStatus(message.id, 'no_expense');
    }
    return result;
  }

  const entries = await applyLearnedRules(message, result.entries);
  const needsCategory = entries.some(entry => !entry.category);
  const nextStatus = needsCategory ? 'needs_category' : 'processed';
  await persistParsedExpenses(message, entries, nextStatus);
  return { ...result, entries };
}
