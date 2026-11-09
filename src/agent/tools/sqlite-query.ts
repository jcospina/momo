import { createRequire } from 'node:module';
import { resolve as resolvePath } from 'node:path';
import { Worker } from 'node:worker_threads';
import { extractTagNgrams } from '@helpers/expenses/expense-category';
import type { QuerySqlInput, QuerySqlResult, SqlExpenseRow } from './sql-types';

export type { SqlExpenseRow } from './sql-types';

// A fresh worker owns only one already-authorized snapshot. SQLite never opens
// the application's database or sees credentials. Termination interrupts even
// a synchronous recursive query; the main request thread stays responsive.
const WORKER_SOURCE = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const SQL = await require(workerData.modulePath)();
  const db = new SQL.Database();
  try {
    db.run('PRAGMA hard_heap_limit = 33554432');
    const heapLimit = db.exec('PRAGMA hard_heap_limit')[0]?.values[0]?.[0];
    if (typeof heapLimit !== 'number' || heapLimit <= 0 || heapLimit > 33554432) {
      throw new Error('SQLite memory limit is unavailable.');
    }
    db.run('CREATE TABLE expenses (id TEXT, user_id TEXT, household_id TEXT, amount_cents INTEGER, currency TEXT, expense_date TEXT, merchant TEXT, category TEXT, note TEXT, tags TEXT)');
    db.run('BEGIN');
    const insert = db.prepare('INSERT INTO expenses VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const row of workerData.rows) {
      insert.run([row.id, row.user_id, row.household_id, row.amount_cents, row.currency, row.expense_date, row.merchant, row.category ?? 'uncategorized', row.note, JSON.stringify(row.tags || [])]);
    }
    insert.free();
    db.run('COMMIT');
    db.create_function('normalize_text', value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase());
    db.run("CREATE VIEW expense_tags AS SELECT DISTINCT e.id AS expense_id, normalize_text(t.value) AS tag FROM expenses e, json_each(e.tags) AS t WHERE typeof(t.value) = 'text'");
    const wholeUnitCurrency = workerData.currency === 'COP';
    const moneyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: workerData.currency, currencyDisplay: 'code',
      minimumFractionDigits: wholeUnitCurrency ? 0 : 2,
      maximumFractionDigits: wholeUnitCurrency ? 0 : 2,
    });
    db.create_function('format_money', amount => {
      if (amount === null) return null;
      if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new Error('format_money requires a finite numeric amount in stored units.');
      }
      return moneyFormatter.format(wholeUnitCurrency ? amount : amount / 100).replace(/\u00a0/g, ' ');
    });
    db.run('PRAGMA query_only = ON');
    const { sql, parameters } = workerData.input;
    const head = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ').trim();
    if (!/^(SELECT|WITH)\b/i.test(head)) throw new Error('Only a SELECT or WITH ... SELECT statement is allowed.');
    let count = 0;
    for (const statement of db.iterateStatements(sql)) {
      count++;
      if (count > 1) throw new Error('Submit exactly one SQL statement.');
    }
    if (count !== 1) throw new Error('Submit exactly one SQL statement.');
    const statement = db.prepare(sql);
    const result = [];
    let bytes = 2;
    try {
      statement.bind(parameters);
      while (statement.step()) {
        const row = statement.getAsObject();
        for (const value of Object.values(row)) {
          if (value instanceof Uint8Array) throw new Error('Return text or numbers, not binary values.');
        }
        bytes += Buffer.byteLength(JSON.stringify(row)) + (result.length ? 1 : 0);
        if (result.length >= 200 || bytes > 16384) throw new Error('Result too large. Aggregate or narrow your query; no partial rows were returned.');
        result.push(row);
      }
    } finally { statement.free(); }
    parentPort.postMessage({ rows: result, truncated: false, currency: workerData.currency });
  } finally { db.close(); }
})().catch(error => {
  const message = String(error.message || error);
  parentPort.postMessage({rows: [], truncated: false, currency: workerData.currency, errorCode: 'SQL_QUERY_FAILED', error: /out of memory/i.test(message) ? 'SQLite memory limit exceeded. Simplify the query or return smaller values; no partial rows were returned.' : message.slice(0, 500)});
});
`;

export async function querySqlSnapshot(
  rows: SqlExpenseRow[],
  input: QuerySqlInput,
  currency = 'USD',
  timeoutMs = 5_000,
): Promise<QuerySqlResult> {
  const failure = (errorCode: string, error: string): QuerySqlResult => ({
    rows: [],
    truncated: false,
    currency,
    errorCode,
    error,
  });
  if (
    input.sql.length > 16_384 ||
    input.parameters.length > 100 ||
    Buffer.byteLength(JSON.stringify(input), 'utf8') > 32_768
  ) {
    return failure('SQL_INPUT_TOO_LARGE', 'Shorten the SQL or parameter list.');
  }
  if (rows.length > 20_000) {
    return failure(
      'SQL_SNAPSHOT_TOO_LARGE',
      'Expense history exceeds the supported snapshot size.',
    );
  }
  let snapshotBytes = 2;
  const preparedRows: SqlExpenseRow[] = [];
  for (const row of rows) {
    if (
      snapshotBytes + Buffer.byteLength(JSON.stringify(row), 'utf8') + 1 >
      8 * 1024 * 1024
    ) {
      return failure(
        'SQL_SNAPSHOT_TOO_LARGE',
        'Expense history exceeds the supported snapshot size.',
      );
    }
    // Old rows may predate tagging, or contain only a subset of the extracted
    // phrases. Repair the read-only projection, never the stored expense.
    const preparedRow = {
      ...row,
      tags: [
        ...new Set([...(row.tags ?? []), ...extractTagNgrams(row.note ?? '')]),
      ],
    };
    snapshotBytes += Buffer.byteLength(JSON.stringify(preparedRow), 'utf8') + 1;
    if (snapshotBytes > 8 * 1024 * 1024) {
      return failure(
        'SQL_SNAPSHOT_TOO_LARGE',
        'Expense history exceeds the supported snapshot size.',
      );
    }
    preparedRows.push(preparedRow);
  }
  return new Promise(resolve => {
    const worker = new Worker(WORKER_SOURCE, {
      eval: true,
      workerData: {
        modulePath: createRequire(
          resolvePath(process.cwd(), 'package.json'),
        ).resolve('sql.js/dist/sql-wasm-inline.js'),
        rows: preparedRows,
        input,
        currency,
      },
      resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
    });
    let finished = false;
    const finish = (result: QuerySqlResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish(
          failure(
            'SQL_TIMEOUT',
            'Query exceeded its time budget. Simplify it.',
          ),
        ),
      timeoutMs,
    );
    worker.once('message', finish);
    worker.once('error', () =>
      finish(
        failure(
          'SQL_WORKER_FAILED',
          'Query execution failed. Simplify the query.',
        ),
      ),
    );
    worker.once('exit', code => {
      if (code !== 0)
        finish(failure('SQL_WORKER_FAILED', 'Query execution stopped.'));
    });
  });
}
