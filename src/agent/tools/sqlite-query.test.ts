/** @jest-environment node */

import { parseChatEntries } from '@helpers/expenses/expense-parser';
import type { QuerySqlInput, SqlExpenseRow } from './sql-types';
import { querySqlSnapshot } from './sqlite-query';

const rows: SqlExpenseRow[] = [
  {
    id: 'one',
    user_id: 'owner',
    household_id: null,
    amount_cents: 125,
    currency: 'USD',
    expense_date: '2026-01-01',
    merchant: null,
    category: 'food',
    note: 'Café',
    tags: ['coffee', 'morning'],
  },
  {
    id: 'two',
    user_id: 'owner',
    household_id: null,
    amount_cents: 275,
    currency: 'USD',
    expense_date: '2026-01-02',
    merchant: null,
    category: 'food',
    note: 'Lunch',
    tags: ['meal'],
  },
];

const input = (
  sql: string,
  parameters: QuerySqlInput['parameters'] = [],
): QuerySqlInput => ({ scope: 'personal', sql, parameters });

describe('isolated SQLite query worker', () => {
  it.each([
    ['COP', 29_298_000, 'COP 29,298,000'],
    ['USD', 12_345, 'USD 123.45'],
    ['EUR', 12_345, 'EUR 123.45'],
    ['USD', -12_345, '-USD 123.45'],
    ['COP', -12_345, '-COP 12,345'],
    ['USD', 0, 'USD 0.00'],
  ])('formats stored monetary units for %s %s', async (currency, amount, formatted) => {
    const result = await querySqlSnapshot(
      [],
      input('SELECT ? AS amount, format_money(?) AS formatted', [
        amount,
        amount,
      ]),
      currency,
    );
    expect(result.rows).toEqual([{ amount, formatted }]);
    expect(result.errorCode).toBeUndefined();
  });

  it('preserves missing amounts and supports aggregate formatting', async () => {
    const result = await querySqlSnapshot(
      rows,
      input(
        'SELECT sum(amount_cents) AS total, format_money(sum(amount_cents)) AS formatted, format_money(NULL) AS missing FROM expenses',
      ),
    );
    expect(result.rows).toEqual([
      { total: 400, formatted: 'USD 4.00', missing: null },
    ]);
  });

  it.each([
    "format_money('123')",
    'format_money(1e999)',
  ])('refuses invalid monetary input: %s', async expression => {
    const result = await querySqlSnapshot(
      [],
      input(`SELECT ${expression} AS formatted`),
    );
    expect(result.rows).toEqual([]);
    expect(result.errorCode).toBe('SQL_QUERY_FAILED');
    expect(result.error).toMatch(/finite numeric/i);
  });

  it('runs aggregates, CTEs, window functions and JSON over the authorized rows', async () => {
    const result = await querySqlSnapshot(
      rows,
      input(`
      WITH totals AS (
        SELECT id, amount_cents, sum(amount_cents) OVER (ORDER BY expense_date) AS running,
          json_extract(tags, '$[0]') AS tag FROM expenses
      ) SELECT id, running, tag FROM totals ORDER BY id
    `),
    );
    expect(result).toEqual({
      rows: [
        { id: 'one', running: 125, tag: 'coffee' },
        { id: 'two', running: 400, tag: 'meal' },
      ],
      truncated: false,
      currency: 'USD',
    });
  });

  it('normalizes accents and case for semantic vocabulary exploration', async () => {
    const result = await querySqlSnapshot(
      rows,
      input('SELECT note FROM expenses WHERE normalize_text(note) = ?', [
        'cafe',
      ]),
    );
    expect(result.rows).toEqual([{ note: 'Café' }]);
    expect(result.errorCode).toBeUndefined();
  });

  it.each([
    'DELETE FROM expenses',
    "UPDATE expenses SET note = 'changed'",
    "INSERT INTO expenses (id) VALUES ('new')",
    'CREATE TABLE stolen AS SELECT * FROM expenses',
    'WITH chosen AS (SELECT id FROM expenses) DELETE FROM expenses WHERE id IN chosen',
    'PRAGMA query_only = OFF',
    "ATTACH DATABASE '/tmp/momo-sql-test.db' AS external",
    "VACUUM INTO '/tmp/momo-sql-test.db'",
    '/* read this */ PRAGMA query_only = OFF',
    '-- comment\nDELETE FROM expenses',
    'SELECT 1; SELECT 2',
    'SELECT 1; /* hidden */ DELETE FROM expenses',
    'SELECT 1; -- hidden\nPRAGMA query_only = OFF',
  ])('rejects unsafe SQL without returning partial rows: %s', async sql => {
    const result = await querySqlSnapshot(rows, input(sql));
    expect(result.errorCode).toBe('SQL_QUERY_FAILED');
    expect(result.rows).toEqual([]);
    expect(result.truncated).toBe(false);
    expect(rows[0].note).toBe('Café');
  });

  it('accepts quoted semicolons and comments without misclassifying them as statements', async () => {
    const result = await querySqlSnapshot(
      rows,
      input("/* start */ SELECT '; -- not SQL /* text */' AS text; -- end"),
    );
    expect(result.rows).toEqual([{ text: '; -- not SQL /* text */' }]);
    expect(result.errorCode).toBeUndefined();
  });

  it('treats parameter strings as values, never executable SQL', async () => {
    const malicious = "'; DELETE FROM expenses; --";
    const result = await querySqlSnapshot(
      rows,
      input('SELECT ? AS value, (SELECT count(*) FROM expenses) AS count', [
        malicious,
      ]),
    );
    expect(result.rows).toEqual([{ value: malicious, count: 2 }]);
  });

  it('returns exactly 200 rows but rejects 201 without partial results', async () => {
    const sql = (limit: number) =>
      `WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n < ${limit}) SELECT n FROM numbers`;
    const accepted = await querySqlSnapshot(rows, input(sql(200)));
    expect(accepted.rows).toHaveLength(200);
    expect(accepted.errorCode).toBeUndefined();
    const refused = await querySqlSnapshot(rows, input(sql(201)));
    expect(refused.rows).toEqual([]);
    expect(refused.error).toMatch(/too large/i);
  });

  it('refuses results beyond 16 KiB without returning earlier rows', async () => {
    const result = await querySqlSnapshot(
      rows,
      input(
        "SELECT 'small' AS text UNION ALL SELECT printf('%17000s', 'large') AS text",
      ),
    );
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(/too large/i);
  });

  it('refuses binary results', async () => {
    const result = await querySqlSnapshot(
      rows,
      input("SELECT x'00FF' AS bytes"),
    );
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(/binary/i);
  });

  it.each([
    "SELECT printf('%100000000s', 'x') AS huge",
    'SELECT randomblob(100000000) AS huge',
  ])('bounds SQLite allocation before materializing a huge value: %s', async sql => {
    const result = await querySqlSnapshot(rows, input(sql));
    expect(result.rows).toEqual([]);
    expect(result.errorCode).toBe('SQL_QUERY_FAILED');
    expect(result.error).toMatch(/memory/i);
  });

  it('times out runaway computation while the main thread remains responsive', async () => {
    let heartbeat = false;
    const timer = setTimeout(() => {
      heartbeat = true;
    }, 25);
    const result = await querySqlSnapshot(
      rows,
      input(
        'WITH RECURSIVE forever(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM forever) SELECT sum(n) FROM forever',
      ),
      'USD',
      300,
    );
    clearTimeout(timer);
    expect(heartbeat).toBe(true);
    expect(result.errorCode).toBe('SQL_TIMEOUT');
    expect(result.rows).toEqual([]);
    const next = await querySqlSnapshot(
      rows,
      input('SELECT count(*) AS count FROM expenses'),
    );
    expect(next.rows).toEqual([{ count: 2 }]);
  });

  it('contains no unrelated application tables or rows', async () => {
    const tables = await querySqlSnapshot(
      rows,
      input("SELECT name FROM sqlite_master WHERE type = 'table'"),
    );
    expect(tables.rows).toEqual([{ name: 'expenses' }]);
    const otherUser = await querySqlSnapshot(
      rows,
      input('SELECT * FROM expenses WHERE user_id = ?', ['someone-else']),
    );
    expect(otherUser.rows).toEqual([]);
    const credentials = await querySqlSnapshot(
      rows,
      input('SELECT * FROM auth.users'),
    );
    expect(credentials.errorCode).toBe('SQL_QUERY_FAILED');
  });

  it('bounds oversized SQL and parameter inventories before worker execution', async () => {
    expect(
      (await querySqlSnapshot(rows, input('SELECT ?', ['x'.repeat(32_769)])))
        .errorCode,
    ).toBe('SQL_INPUT_TOO_LARGE');
    expect(
      (await querySqlSnapshot(rows, input(`SELECT 1 ${' '.repeat(16385)}`)))
        .errorCode,
    ).toBe('SQL_INPUT_TOO_LARGE');
    expect(
      (await querySqlSnapshot(rows, input('SELECT 1', Array(101).fill('x'))))
        .errorCode,
    ).toBe('SQL_INPUT_TOO_LARGE');
  });

  it('bounds standalone snapshot rows and bytes before creating a worker', async () => {
    expect(
      (await querySqlSnapshot(Array(20_001).fill(rows[0]), input('SELECT 1')))
        .errorCode,
    ).toBe('SQL_SNAPSHOT_TOO_LARGE');
    expect(
      (
        await querySqlSnapshot(
          [{ ...rows[0], note: 'x'.repeat(8 * 1024 * 1024) }],
          input('SELECT 1'),
        )
      ).errorCode,
    ).toBe('SQL_SNAPSHOT_TOO_LARGE');
  });
});

describe('typed expense entries and normalized tag view', () => {
  const typedRows = [
    '25 almuerzo crepes',
    '30 almuerzo kntina',
    '60 almuerzo wings',
  ].map((entry, index): SqlExpenseRow => {
    const parsed = parseChatEntries(entry, 'COP').entries[0];
    return {
      id: `typed-${index}`,
      user_id: 'owner',
      household_id: 'home',
      amount_cents: parsed.amount_minor,
      currency: 'COP',
      expense_date: '2026-11-09',
      merchant: null,
      category: parsed.category ?? 'uncategorized',
      note: parsed.raw,
      tags: parsed.tags,
    };
  });

  it('uses actual COP parser amounts and generated tag ngrams with no merchants', () => {
    expect(typedRows.map(row => row.amount_cents)).toEqual([25, 30, 60]);
    expect(typedRows.every(row => row.merchant === null)).toBe(true);
    expect(typedRows[0].tags).toEqual(
      expect.arrayContaining(['almuerzo', 'crepes', 'almuerzo crepes']),
    );
  });

  it.each([
    ['almuerzo', 115, 3],
    ['crepes', 25, 1],
  ])('totals %s without matching merchant', async (tag, total, count) => {
    const result = await querySqlSnapshot(
      typedRows,
      input(
        'SELECT sum(amount_cents) AS total, count(*) AS count FROM expenses e WHERE EXISTS (SELECT 1 FROM expense_tags t WHERE t.expense_id=e.id AND t.tag=?)',
        [tag],
      ),
      'COP',
    );
    expect(result.rows).toEqual([{ total, count }]);
  });

  it('breaks lunch down by actual place tags', async () => {
    const result = await querySqlSnapshot(
      typedRows,
      input(
        "SELECT t.tag AS place, sum(e.amount_cents) AS total, count(*) AS count FROM expenses e JOIN expense_tags t ON t.expense_id=e.id WHERE t.tag IN ('crepes','kntina','wings') AND EXISTS (SELECT 1 FROM expense_tags lunch WHERE lunch.expense_id=e.id AND lunch.tag='almuerzo') GROUP BY t.tag ORDER BY t.tag",
      ),
      'COP',
    );
    expect(result.rows).toEqual([
      { place: 'crepes', total: 25, count: 1 },
      { place: 'kntina', total: 30, count: 1 },
      { place: 'wings', total: 60, count: 1 },
    ]);
  });

  it('does not double-count when multiple tags match the same expense', async () => {
    const result = await querySqlSnapshot(
      typedRows,
      input(
        "SELECT sum(amount_cents) AS total, count(*) AS count FROM expenses e WHERE EXISTS (SELECT 1 FROM expense_tags t WHERE t.expense_id=e.id AND t.tag IN ('almuerzo','crepes','almuerzo crepes'))",
      ),
      'COP',
    );
    expect(result.rows).toEqual([{ total: 115, count: 3 }]);
  });

  it('deduplicates normalized expense/tag pairs', async () => {
    const result = await querySqlSnapshot(
      [{ ...typedRows[0], tags: ['Café', 'CAFE', 'cafe', 'almuerzo'] }],
      input('SELECT expense_id, tag FROM expense_tags ORDER BY tag'),
      'COP',
    );
    expect(result.rows).toEqual([
      { expense_id: 'typed-0', tag: 'almuerzo' },
      { expense_id: 'typed-0', tag: 'almuerzo crepes' },
      { expense_id: 'typed-0', tag: 'cafe' },
      { expense_id: 'typed-0', tag: 'crepes' },
    ]);
  });

  it.each([
    "INSERT INTO expense_tags VALUES ('typed-0','private')",
    "UPDATE expense_tags SET tag='private'",
    'WITH selected AS (SELECT expense_id FROM expense_tags) DELETE FROM expense_tags WHERE expense_id IN selected',
  ])('forbids writes through the tags view: %s', async sql => {
    const result = await querySqlSnapshot(typedRows, input(sql), 'COP');
    expect(result.errorCode).toBe('SQL_QUERY_FAILED');
    expect(result.rows).toEqual([]);
  });
});

it('finds a brand present only in tags without counting multiple matching tags twice', async () => {
  const result = await querySqlSnapshot(
    [
      {
        ...rows[0],
        note: 'Monthly charge',
        merchant: null,
        tags: ['Apple', 'apple services'],
        amount_cents: 1299,
      },
      {
        ...rows[1],
        note: 'Unrelated subscription',
        tags: ['netflix'],
        amount_cents: 8800,
      },
    ],
    input(
      `SELECT COUNT(*) AS count, SUM(amount_cents) AS total,
    format_money(SUM(amount_cents)) AS formatted FROM expenses e
    WHERE EXISTS (SELECT 1 FROM json_each(e.tags) t
      WHERE normalize_text(t.value) LIKE ?)`,
      ['%apple%'],
    ),
    'USD',
  );
  expect(result.errorCode).toBeUndefined();
  expect(result.rows).toEqual([
    { count: 1, total: 1299, formatted: 'USD 12.99' },
  ]);
});

it('keeps legacy rows without a category in expense totals', async () => {
  const result = await querySqlSnapshot(
    [
      { ...rows[0], category: null, amount_cents: 125 },
      { ...rows[1], category: 'income', amount_cents: 900 },
    ],
    input(
      "SELECT category, SUM(amount_cents) AS total FROM expenses WHERE category <> 'income' GROUP BY category",
    ),
    'USD',
  );
  expect(result.errorCode).toBeUndefined();
  expect(result.rows).toEqual([{ category: 'uncategorized', total: 125 }]);
});

it('rebuilds missing and incomplete tags from original notes without mutating source rows', async () => {
  const legacy = [
    {
      ...rows[0],
      id: 'legacy',
      note: '25 almuerzo crepes',
      tags: [],
      amount_cents: 25,
    },
    {
      ...rows[1],
      id: 'partial',
      note: '30 almuerzo wings',
      tags: ['wings'],
      amount_cents: 30,
    },
  ];
  const before = JSON.stringify(legacy);
  const result = await querySqlSnapshot(
    legacy,
    input(
      `SELECT COUNT(*) AS count, SUM(amount_cents) AS total FROM expenses e WHERE EXISTS (SELECT 1 FROM expense_tags t WHERE t.expense_id=e.id AND t.tag = ?)`,
      ['almuerzo'],
    ),
    'COP',
  );
  expect(result.errorCode).toBeUndefined();
  expect(result.rows).toEqual([{ count: 2, total: 55 }]);
  expect(JSON.stringify(legacy)).toBe(before);
});
