/** @jest-environment node */
import { generateText, streamText } from 'ai';
import { runAgent, streamAgent } from './agent-core';
import { AGENT_PROVIDER_OPTIONS } from './constants';
import { buildAgentTools } from './tools/tools';

jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  stepCountIs: jest.fn((count: number) => count),
  tool: jest.fn(value => value),
}));

const context = { currency: 'USD' as const };
const input = { scope: 'personal' as const, sql: 'SELECT 1', parameters: [] };
const output = { rows: [{ n: 1 }], truncated: false, currency: 'USD' };
const model = 'test-model';

it('offers only SQL and allows ten queries plus a final answer for both runtimes', async () => {
  jest.mocked(generateText).mockResolvedValue({
    text: 'done',
    steps: [],
    toolCalls: [],
    toolResults: [],
  } as never);
  const toolExecutors = { querySql: jest.fn().mockResolvedValue(output) };
  await runAgent({ context, model, messages: [], toolExecutors });
  streamAgent({ context, model, messages: [], toolExecutors });
  for (const mock of [generateText, streamText]) {
    const options = jest.mocked(mock).mock.calls[0][0];
    expect(Object.keys(options.tools ?? {})).toEqual(['querySql']);
    expect(options.stopWhen).toBe(11);
    expect(options.providerOptions).toEqual(AGENT_PROVIDER_OPTIONS);
    const prepare = options.prepareStep as (input: unknown) => unknown;
    expect(prepare({ steps: [{ toolCalls: Array(9).fill({}) }] })).toEqual({
      toolChoice: 'auto',
    });
    expect(prepare({ steps: [{ toolCalls: Array(10).fill({}) }] })).toEqual({
      toolChoice: 'none',
    });
  }
});

it('enforces the query limit even if a provider sends extra parallel calls', async () => {
  const querySql = jest.fn().mockResolvedValue(output);
  const tools = buildAgentTools({ querySql }, context);
  const execute = tools.querySql.execute as unknown as (
    value: typeof input,
  ) => Promise<unknown>;
  const results = await Promise.all(
    Array.from({ length: 12 }, () => execute(input)),
  );
  expect(querySql).toHaveBeenCalledTimes(10);
  expect(results[10]).toMatchObject({ errorCode: 'QUERY_BUDGET_EXHAUSTED' });
  expect(results[11]).toMatchObject({ errorCode: 'QUERY_BUDGET_EXHAUSTED' });
});

it('returns a visible data failure and counts failed attempts against the budget', async () => {
  const querySql = jest
    .fn()
    .mockRejectedValue(new Error('secret database details'));
  const execute = buildAgentTools({ querySql }, context).querySql
    .execute as unknown as (value: typeof input) => Promise<unknown>;
  for (let i = 0; i < 10; i++) {
    const result = await execute(input);
    expect(result).toMatchObject({ errorCode: 'DATA_UNAVAILABLE', rows: [] });
    expect(JSON.stringify(result)).not.toContain('secret');
  }
  expect(await execute(input)).toMatchObject({
    errorCode: 'QUERY_BUDGET_EXHAUSTED',
  });
});
