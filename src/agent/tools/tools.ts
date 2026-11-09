import { tool } from 'ai';
import { z } from 'zod';
import type { AgentContext } from '@/agent/context';
import { loadSqlExpenseSnapshot } from './sql-snapshot-loader';
import type { QuerySqlInput, QuerySqlResult, SqlExpenseRow } from './sql-types';
import { querySqlSnapshot } from './sqlite-query';

export const MAX_SQL_QUERIES = 10;
export type AgentToolExecutors = {
  querySql: (
    input: QuerySqlInput,
    context: AgentContext,
  ) => Promise<QuerySqlResult>;
};

export const productionToolExecutors: AgentToolExecutors = {
  async querySql(input, context) {
    const rows = await loadSqlExpenseSnapshot(context, input.scope);
    return querySqlSnapshot(rows, input, context.currency);
  },
};

export function buildAgentTools(
  executors: AgentToolExecutors,
  context: AgentContext,
) {
  let attempts = 0;
  let payloadBytes = 0;
  const snapshots = new Map<QuerySqlInput['scope'], Promise<SqlExpenseRow[]>>();
  const query =
    executors === productionToolExecutors
      ? async (input: QuerySqlInput) => {
          let snapshot = snapshots.get(input.scope);
          if (!snapshot) {
            snapshot = loadSqlExpenseSnapshot(context, input.scope);
            snapshots.set(input.scope, snapshot);
            snapshot.catch(() => snapshots.delete(input.scope));
          }
          return querySqlSnapshot(await snapshot, input, context.currency);
        }
      : (input: QuerySqlInput) => executors.querySql(input, context);
  return {
    querySql: tool({
      description:
        'Run one parameterized read-only SQLite SELECT (including CTEs, joins, subqueries and window functions) on the authorized expenses table. Choose personal or household scope. Inspect stored descriptions to interpret meaning, then calculate in SQL. Errors consume a query and can be corrected. Maximum ten queries.',
      inputSchema: z.object({
        scope: z.enum(['personal', 'household']),
        sql: z.string(),
        parameters: z.array(z.union([z.string(), z.number(), z.null()])),
      }),
      execute: async input => {
        const failure = (errorCode: string, error: string): QuerySqlResult => ({
          rows: [],
          truncated: false,
          currency: context.currency,
          errorCode,
          error,
        });
        if (++attempts > MAX_SQL_QUERIES)
          return failure(
            'QUERY_BUDGET_EXHAUSTED',
            'No queries remain. Answer only from evidence already obtained.',
          );
        if (payloadBytes >= 65_536)
          return failure(
            'RESULT_BUDGET_EXHAUSTED',
            'Result budget exhausted. Answer only from evidence already obtained.',
          );
        try {
          const result = await query(input);
          const bytes = Buffer.byteLength(JSON.stringify(result));
          if (payloadBytes + bytes > 65_536)
            return failure(
              'RESULT_BUDGET_EXHAUSTED',
              'Result would exceed the remaining budget. Aggregate or narrow the query.',
            );
          payloadBytes += bytes;
          return result;
        } catch {
          return failure(
            'DATA_UNAVAILABLE',
            'Could not load authorized expense data. This is a failure, not an empty ledger or zero spending.',
          );
        }
      },
    }),
  };
}
