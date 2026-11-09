import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { testCases } from '@evals/momo-agent-cases';
import type { NormalizedToolCall } from '@/agent/trace';
import { assessAnswer } from './assess';
import { heldOutCases } from './held-out';

// Reassess saved traces without another model call or rewriting original results.
const directory = process.argv[2];
if (!directory)
  throw new Error('Pass a directory containing local eval traces');
const cases = new Map(
  [...testCases, ...heldOutCases].map(testCase => [testCase.id, testCase]),
);
const reviews = readdirSync(directory)
  .filter(file => file.endsWith('.json') && file !== 'summary.json')
  .map(file => {
    const trace = JSON.parse(
      readFileSync(path.join(directory, file), 'utf8'),
    ) as {
      id: string;
      text?: string;
      calls?: NormalizedToolCall[];
      error?: string;
    };
    const testCase = cases.get(trace.id);
    if (!testCase || trace.error)
      return { id: trace.id, error: trace.error ?? 'Unknown case' };
    return {
      id: trace.id,
      assessment: assessAnswer(testCase, trace.text ?? '', trace.calls ?? []),
    };
  });
console.log(
  JSON.stringify(
    {
      count: reviews.length,
      assessmentMethod:
        'Mechanical checks only; independently review all final claims, language and ambiguity.',
      cases: reviews,
    },
    null,
    2,
  ),
);
