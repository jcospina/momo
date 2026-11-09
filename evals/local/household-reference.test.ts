/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { extractTagNgrams } from '@helpers/expenses/expense-category';
import { parseChatEntries } from '@helpers/expenses/expense-parser';
import { querySqlSnapshot } from '@/agent/tools/sqlite-query';
import { buildHouseholdCases, type HouseholdFixture } from './household-cases';

const fixture = JSON.parse(
  readFileSync('evals/mocks/dataset/household-typed.synthetic.json', 'utf8'),
) as HouseholdFixture;
const cases = buildHouseholdCases(fixture);

it('uses actual parser amounts and tag extraction, retaining explicitly modeled legacy gaps', () => {
  expect(fixture.rows).toHaveLength(462);
  for (const row of fixture.rows) {
    const parsed = parseChatEntries(row.source_input, 'COP');
    expect(parsed.status).toBe('parsed');
    expect(parsed.entries[0].amount_minor).toBe(row.amount_cents);
    if (row.tags?.length)
      expect(row.tags).toEqual(extractTagNgrams(row.note ?? ''));
  }
  expect(fixture.rows.filter(row => !row.tags?.length)).toHaveLength(13);
  expect(fixture.rows.filter(row => row.merchant === null)).toHaveLength(414);
  expect(fixture.rows.filter(row => /\d/.test(row.note ?? ''))).toHaveLength(
    418,
  );
  expect(fixture.rows.some(row => row.category === 'income')).toBe(false);
});

it('references distinguish personal totals, overlap union and a null category', () => {
  const expected = (id: string) => cases.find(test => test.id === id)?.expected;
  expect(expected('household-lunch')).toEqual({
    kind: 'amounts',
    amounts: [695000],
    transactionCount: 19,
  });
  expect(expected('personal-lunch')).toEqual({
    kind: 'amounts',
    amounts: [400000],
    transactionCount: 11,
  });
  expect(expected('overlapping-lunch-crepes')).toEqual({
    kind: 'amounts',
    amounts: [844000],
    transactionCount: 23,
  });
  expect(expected('uncategorized-including-null')).toEqual({
    kind: 'amounts',
    amounts: [373000],
    transactionCount: 11,
  });
});

it('reproduces reference totals with tag-first SQL plus a missing-tag note fallback', async () => {
  const result = await querySqlSnapshot(
    fixture.rows,
    {
      scope: 'household',
      parameters: ['almuerzo'],
      sql: `SELECT SUM(e.amount_cents) AS total, COUNT(*) AS n FROM expenses e
      WHERE EXISTS(SELECT 1 FROM expense_tags t WHERE t.expense_id=e.id AND t.tag=?)
      OR (NOT EXISTS(SELECT 1 FROM expense_tags t WHERE t.expense_id=e.id) AND normalize_text(e.note) LIKE '%almuerzo%')`,
    },
    'COP',
  );
  expect(result.errorCode).toBeUndefined();
  expect(result.rows).toEqual([{ total: 695000, n: 19 }]);
  const nullCategory = await querySqlSnapshot(
    fixture.rows,
    {
      scope: 'household',
      parameters: [],
      sql: "SELECT SUM(amount_cents) AS total, COUNT(*) AS n FROM expenses WHERE category='uncategorized'",
    },
    'COP',
  );
  expect(nullCategory.rows).toEqual([{ total: 373000, n: 11 }]);
});
