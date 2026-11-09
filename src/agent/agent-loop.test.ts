/** @jest-environment node */
import { MockLanguageModelV3 } from 'ai/test';
import { runAgent } from './agent-core';

it('executes exactly ten SQL reads and still produces a final answer with the real SDK loop', async () => {
  let turn = 0;
  const querySql = jest.fn().mockResolvedValue({
    rows: [{ count: 1 }],
    currency: 'USD',
    truncated: false,
  });
  const model = new MockLanguageModelV3({
    doGenerate: async options => {
      turn++;
      const done = options.toolChoice?.type === 'none';
      return {
        content: done
          ? [{ type: 'text', text: 'Final answer after ten reads.' }]
          : [
              {
                type: 'tool-call',
                toolCallId: `read-${turn}`,
                toolName: 'querySql',
                input: JSON.stringify({
                  scope: 'personal',
                  sql: 'SELECT count(*) FROM expenses',
                  parameters: [],
                }),
              },
            ],
        finishReason: { unified: done ? 'stop' : 'tool-calls', raw: undefined },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
  const result = await runAgent({
    model,
    context: { currency: 'USD' },
    messages: [{ role: 'user', content: 'Test the query budget' }],
    toolExecutors: { querySql },
  });
  expect(querySql).toHaveBeenCalledTimes(10);
  expect(turn).toBe(11);
  expect(result.text).toBe('Final answer after ten reads.');
});

it('streams the final answer after the tenth query with the real SDK loop', async () => {
  const { simulateReadableStream } = await import('ai');
  const { streamAgent } = await import('./agent-core');
  let turn = 0;
  const querySql = jest.fn().mockResolvedValue({
    rows: [{ count: 1 }],
    currency: 'USD',
    truncated: false,
  });
  const model = new MockLanguageModelV3({
    doStream: async options => {
      turn++;
      const done = options.toolChoice?.type === 'none';
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: 'stream-start', warnings: [] },
            ...(done
              ? [
                  { type: 'text-start' as const, id: 'answer' },
                  {
                    type: 'text-delta' as const,
                    id: 'answer',
                    delta: 'Final streamed answer.',
                  },
                  { type: 'text-end' as const, id: 'answer' },
                ]
              : [
                  {
                    type: 'tool-call' as const,
                    toolCallId: `read-${turn}`,
                    toolName: 'querySql',
                    input: JSON.stringify({
                      scope: 'personal',
                      sql: 'SELECT count(*) FROM expenses',
                      parameters: [],
                    }),
                  },
                ]),
            {
              type: 'finish',
              finishReason: {
                unified: done ? 'stop' : 'tool-calls',
                raw: undefined,
              },
              usage: {
                inputTokens: {
                  total: 1,
                  noCache: 1,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 1, text: 1, reasoning: 0 },
              },
            },
          ],
        }),
      };
    },
  });
  const onFinish = jest.fn();
  const result = streamAgent({
    model,
    context: { currency: 'USD' },
    messages: [{ role: 'user', content: 'Test' }],
    toolExecutors: { querySql },
    onFinish,
  });
  let text = '';
  for await (const chunk of result.textStream) text += chunk;
  expect(text).toBe('Final streamed answer.');
  expect(querySql).toHaveBeenCalledTimes(10);
  expect(turn).toBe(11);
  expect(onFinish).toHaveBeenCalledTimes(1);
});
