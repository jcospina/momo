import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { GoldenFixture } from '@evals/types/setup';
import { extractTagNgrams } from '@helpers/expenses/expense-category';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import type { AgentContext } from '@/agent/context';
import {
  querySqlSnapshot,
  type SqlExpenseRow,
} from '@/agent/tools/sqlite-query';
import type { AgentToolExecutors } from '@/agent/tools/tools';

export function fixtureRuntime(currency: SupportedCurrency) {
  const fixture = JSON.parse(
    readFileSync(
      path.resolve(
        'evals/mocks/dataset',
        `expenses.${currency.toLowerCase()}.golden.json`,
      ),
      'utf8',
    ),
  ) as GoldenFixture;
  const rows = fixture.rows.map((row, index) => ({
    ...row,
    id: `fixture-${index}`,
    chat_message_id: null,
    created_at: `${row.expense_date}T12:00:00Z`,
    tags: extractTagNgrams(row.note ?? ''),
  })) as SqlExpenseRow[];
  const context: AgentContext = {
    currency,
    currentDate: fixture.metadata.endDate,
    timezone: 'America/Bogota',
    // Legacy questions originate in personal chat; household requests are explicit.
    auth: {
      userId: 'sample-owner',
      accessToken: 'offline-fixture-only',
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'offline-fixture-only',
    },
  };
  const toolExecutors: AgentToolExecutors = {
    querySql: async input =>
      querySqlSnapshot(
        rows.filter(row =>
          input.scope === 'personal'
            ? row.user_id === 'sample-owner'
            : row.household_id === 'sample-household',
        ),
        input,
        currency,
      ),
  };
  return { context, toolExecutors };
}
