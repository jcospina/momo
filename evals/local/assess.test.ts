import { testCases } from '@evals/momo-agent-cases';
import type { NormalizedToolCall } from '@/agent/trace';
import { assessAnswer } from './assess';

const testCase = testCases.find(test => test.id === 'max-spend-month-en')!;
const call: NormalizedToolCall = {
  id: 'query-1',
  tool: 'querySql',
  input: {
    scope: 'personal',
    sql: 'SELECT sum(amount_cents) FROM expenses',
    parameters: [],
  },
  output: { rows: [{ amount: 28_449_156 }], truncated: false, currency: 'COP' },
};

it('does not let correct tool evidence hide an incorrect final amount', () => {
  const result = assessAnswer(testCase, 'You spent $12,000.', [call]);
  expect(result.expectedPrimaryValueInEvidence).toBe(true);
  expect(result.expectedPrimaryValueInAnswer).toBe(false);
});

it('recognizes both common currency separator conventions', () => {
  for (const amount of ['$28,449,156', '$28.449.156']) {
    expect(
      assessAnswer(testCase, `July: ${amount}`, [call])
        .expectedPrimaryValueInAnswer,
    ).toBe(true);
  }
});

it('does not accept an error response as financial evidence', () => {
  const failed = {
    ...call,
    output: { errorCode: 'QUERY_FAILED', rows: [{ amount: 28_449_156 }] },
  };
  const result = assessAnswer(testCase, 'I could not retrieve the data.', [
    failed,
  ]);
  expect(result.expectedPrimaryValueInEvidence).toBe(false);
  expect(result.toolErrors).toBe(1);
});

it('checks privacy refusal together with absence of SQL calls', () => {
  const privacy = testCases.find(
    test => test.id === 'privacy-other-person-personal-total-en',
  )!;
  expect(
    assessAnswer(privacy, "I can't access their private expenses.", [])
      .privacyRefusal,
  ).toBe(true);
  expect(
    assessAnswer(privacy, "I can't access their private expenses.", [call])
      .privacyRefusal,
  ).toBe(false);
  expect(
    assessAnswer(
      privacy,
      'I can’t access or disclose their personal spending.',
      [],
    ).privacyRefusal,
  ).toBe(true);
});

it('accepts SQL aggregates converted to major units without changing answer checks', () => {
  const usd = testCases.find(test => test.id === 'top-category-last-month-en')!;
  const converted = {
    ...call,
    output: {
      rows: [{ total_usd: 2440.35 }],
      currency: 'USD',
      truncated: false,
    },
  };
  const valid = assessAnswer(usd, 'Housing: USD 2,440.35.', [converted]);
  expect(valid.expectedPrimaryValueInEvidence).toBe(true);
  expect(valid.expectedPrimaryValueInAnswer).toBe(true);
  expect(
    assessAnswer(usd, 'Housing: USD 244.03.', [converted])
      .expectedPrimaryValueInAnswer,
  ).toBe(false);
});
