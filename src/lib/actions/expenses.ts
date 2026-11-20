'use server';

import { AMOUNT_REGEX, MULTIPLIERS } from '@constants/expenses/amounts';
import { isExpenseCategory } from '@constants/expenses/categories';
import { upsertCategoryRule } from '@helpers/expenses/category-rules';
import { buildCategoryKey } from '@helpers/expenses/expense-category';
import {
  fetchExpensesByMessageId,
  fetchExpensesByMessageIds,
} from '@helpers/expenses/expense-fetch';
import { updateExpenses as updateExpenseRows } from '@helpers/expenses/expense-update';
import { createSupabaseServerClient } from '@lib-supabase/server';
import {
  EXPENSE_CATEGORIES,
  type ExpenseRecord,
  type ExpenseUpdateInput,
  type UpdateExpensesResult,
} from '@lib-types/expenses';

type GetExpensesByMessageIdInput = {
  messageId: string;
};

type GetExpensesByMessageIdResult = {
  expenses: ExpenseRecord[];
};

type ParsedExpenseUpdate = {
  id: string;
  amount_cents: number;
  expense_date: string;
  category: string | null;
  merchant: string | null;
  note?: string | null;
};

type ExpenseLearningSnapshot = {
  id: string;
  note: string | null;
  household_id: string | null;
};

export async function getExpensesByMessageId({
  messageId,
}: GetExpensesByMessageIdInput): Promise<GetExpensesByMessageIdResult> {
  const trimmed = messageId?.trim();
  if (!trimmed) {
    return { expenses: [] };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { expenses: [] };
  }

  const expenses = await fetchExpensesByMessageId({
    supabase,
    messageId: trimmed,
  });

  return { expenses };
}

/** One request covers at most this many messages; callers chunk above it. */
const MAX_EXPENSE_BATCH = 100;

type GetExpensesByMessageIdsInput = {
  messageIds: string[];
};

type GetExpensesByMessageIdsResult = {
  /** Every requested id is present, with `[]` when it has no lines. */
  expensesByMessageId: Record<string, ExpenseRecord[]>;
  errorCode?: 'auth_required' | 'expenses_fetch_failed';
};

export async function getExpensesByMessageIds({
  messageIds,
}: GetExpensesByMessageIdsInput): Promise<GetExpensesByMessageIdsResult> {
  const ids = [
    ...new Set(
      (messageIds ?? [])
        .map(id => id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ].slice(0, MAX_EXPENSE_BATCH);
  if (ids.length === 0) {
    return { expensesByMessageId: {} };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { expensesByMessageId: {}, errorCode: 'auth_required' };
  }

  const { expensesByMessageId, failed } = await fetchExpensesByMessageIds({
    supabase,
    messageIds: ids,
  });
  return failed
    ? { expensesByMessageId: {}, errorCode: 'expenses_fetch_failed' }
    : { expensesByMessageId };
}

type UpdateExpensesInput = {
  updates: ExpenseUpdateInput[];
  messageId?: string | null;
};

type UpdateExpensesAuthResult =
  | {
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      userId: string;
    }
  | { errorCode: 'auth_required' };

type ParsedUpdatesResult =
  | { updates: ParsedExpenseUpdate[] }
  | { errorCode: 'expense_amount_invalid' | 'expense_category_invalid' };

const KNOWN_CATEGORIES = new Set<string>(EXPENSE_CATEGORIES);

// Categories are shown to every household member, so only the app's own
// vocabulary is accepted (null means "needs category").
function isKnownCategory(category: unknown): boolean {
  return (
    category === null ||
    category === undefined ||
    (typeof category === 'string' && KNOWN_CATEGORIES.has(category))
  );
}

function toMinorUnits(value: number, currency: string) {
  if (currency === 'COP') {
    return Math.round(value);
  }
  return Math.round(value * 100);
}

function parseAmountInput(amount: string, currency: string): number | null {
  const trimmed = amount?.trim?.() ?? '';
  const match = trimmed.match(AMOUNT_REGEX);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const suffix = match[2] ? match[2].toLowerCase() : null;
  const multiplier = suffix ? (MULTIPLIERS[suffix] ?? 1) : 1;
  const amountMinor = toMinorUnits(value * multiplier, currency);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return null;
  return amountMinor;
}

async function authenticate(): Promise<UpdateExpensesAuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { errorCode: 'auth_required' };
  }

  return { supabase, userId: user.id };
}

function parseAndValidateUpdates(
  updates: ExpenseUpdateInput[],
): ParsedUpdatesResult {
  if (!updates.every(update => isKnownCategory(update.category))) {
    return { errorCode: 'expense_category_invalid' };
  }

  const parsedUpdates = updates.map(update => {
    const amountCents = parseAmountInput(update.amount, update.currency);
    if (amountCents === null) {
      return { error: 'expense_amount_invalid' as const };
    }

    const hasNote = Object.hasOwn(update, 'note');
    const normalizedNote = hasNote ? update.note?.trim() || null : undefined;

    return {
      id: update.id,
      amount_cents: amountCents,
      expense_date: update.expense_date,
      category: update.category ?? null,
      merchant: update.merchant?.trim() || null,
      note: normalizedNote,
    };
  });

  if (parsedUpdates.some(update => 'error' in update)) {
    return { errorCode: 'expense_amount_invalid' };
  }

  return { updates: parsedUpdates as ParsedExpenseUpdate[] };
}

function getCategorizedUpdates(updates: ParsedExpenseUpdate[]) {
  return updates.filter(
    (update): update is ParsedExpenseUpdate & { category: string } =>
      update.category !== null,
  );
}

async function fetchLearningSnapshots({
  supabase,
  categorizedUpdates,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  categorizedUpdates: Array<ParsedExpenseUpdate & { category: string }>;
}): Promise<Map<string, ExpenseLearningSnapshot>> {
  const expenseSourceById = new Map<string, ExpenseLearningSnapshot>();

  if (!categorizedUpdates.length) {
    return expenseSourceById;
  }

  const categorizedIds = Array.from(
    new Set(categorizedUpdates.map(update => update.id)),
  );
  const { data, error: snapshotError } = await supabase
    .from('expenses')
    .select('id, note, household_id')
    .in('id', categorizedIds);

  if (snapshotError) {
    console.warn('category rule snapshot fetch failed', snapshotError);
    return expenseSourceById;
  }

  ((data as ExpenseLearningSnapshot[] | null) ?? []).forEach(snapshot => {
    expenseSourceById.set(snapshot.id, snapshot);
  });

  return expenseSourceById;
}

async function updateExpenseRowsOrFail({
  supabase,
  updates,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  updates: ParsedExpenseUpdate[];
}): Promise<{ errorCode?: 'expense_update_failed' }> {
  const { error } = await updateExpenseRows({
    supabase,
    updates,
  });

  if (error) {
    return { errorCode: 'expense_update_failed' };
  }

  return {};
}

function triggerCategoryRuleLearning({
  supabase,
  userId,
  categorizedUpdates,
  expenseSourceById,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  categorizedUpdates: Array<ParsedExpenseUpdate & { category: string }>;
  expenseSourceById: Map<string, ExpenseLearningSnapshot>;
}) {
  if (!categorizedUpdates.length) {
    return;
  }

  void Promise.allSettled(
    categorizedUpdates.map(update => {
      const source = expenseSourceById.get(update.id);
      if (!source) {
        return Promise.resolve();
      }

      const normalizedText = buildCategoryKey(source.note ?? '');
      if (!normalizedText) {
        return Promise.resolve();
      }

      const upserts = [
        upsertCategoryRule({
          supabase,
          userId,
          householdId: source.household_id,
          normalizedText,
          category: update.category,
        }),
      ];

      // Household edits should still teach the current user's personal scope.
      if (source.household_id) {
        upserts.push(
          upsertCategoryRule({
            supabase,
            userId,
            householdId: null,
            normalizedText,
            category: update.category,
          }),
        );
      }

      return Promise.all(upserts).then(() => undefined);
    }),
  ).catch(error => {
    console.warn('category rule learning failed', error);
  });
}

async function syncMessageStatusAfterExpenseUpdate({
  supabase,
  userId,
  messageId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  messageId: string | null;
}) {
  const trimmedMessageId = messageId?.trim();
  if (!trimmedMessageId) {
    return;
  }

  const expenses = await fetchExpensesByMessageId({
    supabase,
    messageId: trimmedMessageId,
  });
  // The DB default 'uncategorized' (and any unknown slug) still needs a
  // category; only a known category counts as filed.
  const needsCategory = expenses.some(
    expense => !isExpenseCategory(expense.category),
  );
  const nextStatus = needsCategory ? 'needs_category' : 'processed';
  await supabase
    .from('chat_messages')
    .update({ status: nextStatus })
    .eq('id', trimmedMessageId)
    .eq('user_id', userId);
}

export async function updateExpenses({
  updates,
  messageId = null,
}: UpdateExpensesInput): Promise<UpdateExpensesResult> {
  if (!updates?.length) {
    return { updatedIds: [] };
  }

  const auth = await authenticate();
  if ('errorCode' in auth) {
    return auth;
  }

  const parseResult = parseAndValidateUpdates(updates);
  if ('errorCode' in parseResult) {
    return parseResult;
  }

  const categorizedUpdates = getCategorizedUpdates(parseResult.updates);
  const expenseSourceById = await fetchLearningSnapshots({
    supabase: auth.supabase,
    categorizedUpdates,
  });

  const updateResult = await updateExpenseRowsOrFail({
    supabase: auth.supabase,
    updates: parseResult.updates,
  });
  if (updateResult.errorCode) {
    return updateResult;
  }

  triggerCategoryRuleLearning({
    supabase: auth.supabase,
    userId: auth.userId,
    categorizedUpdates,
    expenseSourceById,
  });

  await syncMessageStatusAfterExpenseUpdate({
    supabase: auth.supabase,
    userId: auth.userId,
    messageId,
  });

  return {
    updatedIds: updates.map(update => update.id),
  };
}
