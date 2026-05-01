import { createOpenAI } from '@ai-sdk/openai';
import type { ModelMessage } from 'ai';
import { Eval } from 'braintrust';
import { runAgent } from '@/agent/agent-core';
import { mockToolExecutors } from '@/agent/tools/mock-executors';

type Difficulty = 'simple' | 'medium' | 'hard' | 'edge';
type Category =
  | 'scope'
  | 'date-range'
  | 'tool-choice'
  | 'numerical-correctness'
  | 'refusal';

type MomoAgentEvalCase = {
  id: string;
  input: string;
  expected: string[];
  difficulty: Difficulty;
  category: Category;
};

type MomoAgentEvalOutput = {
  text: string;
  toolCalls: unknown[];
};

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Intentionally empty for now. Add cases here once the naive runtime has been
// smoke-tested and there is real behavior worth scoring.
const testCases: MomoAgentEvalCase[] = [];

function buildMessages(testCase: MomoAgentEvalCase): ModelMessage[] {
  return [{ role: 'user', content: testCase.input }];
}

Eval<MomoAgentEvalCase, MomoAgentEvalOutput, MomoAgentEvalCase>('MoMo Agent', {
  data: () =>
    testCases.map(testCase => ({
      input: testCase,
      expected: testCase,
      metadata: {
        id: testCase.id,
        category: testCase.category,
        difficulty: testCase.difficulty,
        toolMode: 'mock',
      },
    })),
  task: async testCase => {
    const result = await runAgent({
      model: openai(process.env.MOMO_AGENT_MODEL ?? 'gpt-5.4-mini'),
      messages: buildMessages(testCase),
      toolExecutors: mockToolExecutors,
    });

    return {
      text: result.text,
      toolCalls: result.toolCalls,
    };
  },
  scores: [],
});
