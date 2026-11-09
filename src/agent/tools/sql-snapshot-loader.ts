import type { AgentContext } from '@/agent/context';
import type { SqlExpenseRow } from './sql-types';
import { createAgentSupabaseClient } from './supabase-client';

const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;
const MAX_BYTES = 8 * 1024 * 1024;
const EXPENSE_COLUMNS =
  'id,user_id,household_id,amount_cents,currency,expense_date,merchant,category,note,tags';

export async function loadSqlExpenseSnapshot(
  context: AgentContext,
  scope: 'personal' | 'household',
): Promise<SqlExpenseRow[]> {
  const { auth } = context;
  if (!auth) throw new Error('Authentication is required to read expenses.');
  const client = createAgentSupabaseClient(auth);
  let householdId: string | null = null;

  if (scope === 'household') {
    if (context.householdId === null) return [];
    let membership = client
      .from('household_members')
      .select('household_id')
      .eq('user_id', auth.userId);
    if (context.householdId !== undefined) {
      membership = membership.eq('household_id', context.householdId);
    }
    const { data, error } = await membership.limit(1).maybeSingle();
    if (error) throw new Error('Unable to verify household access.');
    householdId = data?.household_id ?? null;
    if (!householdId) {
      if (context.householdId !== undefined) {
        throw new Error('Household access is unavailable.');
      }
      return [];
    }
    if (
      context.householdId !== undefined &&
      householdId !== context.householdId
    ) {
      throw new Error('Household access is unavailable.');
    }
  }

  const rows: SqlExpenseRow[] = [];
  let bytes = 2;
  let cursor: string | undefined;
  while (true) {
    let query = client
      .from('expenses')
      .select(EXPENSE_COLUMNS)
      .eq('currency', context.currency);
    query =
      scope === 'personal'
        ? query.eq('user_id', auth.userId)
        : query.eq('household_id', householdId);
    if (cursor !== undefined) query = query.gt('id', cursor);
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(0, PAGE_SIZE - 1);
    if (error || !Array.isArray(data)) {
      throw new Error('Unable to load expense data.');
    }
    for (const row of data as SqlExpenseRow[]) {
      if (
        typeof row.id !== 'string' ||
        (cursor !== undefined && row.id <= cursor) ||
        row.currency !== context.currency ||
        (scope === 'personal'
          ? row.user_id !== auth.userId
          : row.household_id !== householdId)
      ) {
        throw new Error('Expense data did not match the authorized scope.');
      }
      bytes += Buffer.byteLength(JSON.stringify(row), 'utf8') + 1;
      if (rows.length >= MAX_ROWS || bytes > MAX_BYTES) {
        throw new Error('Expense history exceeds the supported snapshot size.');
      }
      rows.push(row);
      cursor = row.id;
    }
    if (data.length < PAGE_SIZE) return rows;
  }
}
