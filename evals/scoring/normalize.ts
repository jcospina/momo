import type { MomoAgentEvalCase } from '@evals/types/cases';
import type { NormalizedToolCall } from '@evals/types/scoring';
import type { ModelMessage } from 'ai';
import type { runAgent } from '@/agent/agent-core';

type ToolPart = {
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
};

type AgentResult = Awaited<ReturnType<typeof runAgent>>;

/**
 * Wraps the eval case input in the message envelope `runAgent` expects.
 */
export function buildMessages(testCase: MomoAgentEvalCase): ModelMessage[] {
  return [{ role: 'user', content: testCase.input }];
}

/**
 * Flattens the agent's stepwise tool calls into a single ordered list paired
 * with their results. Scorers consume this view rather than the raw step graph.
 */
export function normalizeToolCalls(result: AgentResult): NormalizedToolCall[] {
  const toolCalls = result.steps.flatMap(step => step.toolCalls) as ToolPart[];
  const toolResults = result.steps.flatMap(
    step => step.toolResults,
  ) as ToolPart[];

  return toolCalls.map(toolCall => {
    const toolResult = toolResults.find(
      part => part.toolCallId === toolCall.toolCallId,
    );

    return {
      id: toolCall.toolCallId ?? '',
      tool: toolCall.toolName ?? 'unknown',
      input: toolCall.input,
      output: toolResult?.output,
    };
  });
}
