/** @jest-environment node */

import fixture from '@evals/mocks/dataset/household-typed.synthetic.json';
import { extractTagNgrams } from '@helpers/expenses/expense-category';
import { parseChatEntries } from '@helpers/expenses/expense-parser';

it('preserves the measured structural gaps in a synthetic household fixture', () => {
  const rows = fixture.rows;
  expect(fixture.metadata.synthetic).toBe(true);
  expect(rows).toHaveLength(462);
  expect(rows.filter(row => row.merchant === null)).toHaveLength(414);
  expect(rows.filter(row => row.tags.length === 0)).toHaveLength(13);
  expect(rows.filter(row => /\d/.test(row.note))).toHaveLength(418);
  expect(rows.filter(row => row.category === null)).toHaveLength(1);
  expect(rows.filter(row => row.category === 'income')).toHaveLength(0);
  expect(new Set(rows.map(row => row.currency))).toEqual(new Set(['COP']));
  expect(new Set(rows.map(row => row.user_id)).size).toBe(2);
  expect(
    rows.every(
      row =>
        row.id.startsWith('synthetic-') &&
        row.household_id === 'synthetic-household',
    ),
  ).toBe(true);
  const tagDepths: Record<string, number> = {};
  for (const row of rows)
    tagDepths[row.tags.length] = (tagDepths[row.tags.length] ?? 0) + 1;
  expect(tagDepths).toEqual(fixture.metadata.measuredAggregateTarget.tagCounts);
});

it('uses actual typing/parser rules rather than invented amounts and enriched tags', () => {
  for (const row of fixture.rows) {
    const parsed = parseChatEntries(row.source_input, 'COP');
    expect(parsed.status).toBe('parsed');
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].amount_minor).toBe(row.amount_cents);
    if (row.tags.length) expect(row.tags).toEqual(extractTagNgrams(row.note));
  }
});
