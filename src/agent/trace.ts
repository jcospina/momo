import type { runAgent } from './agent-core';

type ToolPart = {
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
};

export type NormalizedToolCall = {
  id: string;
  tool: string;
  input: unknown;
  output: unknown;
};

export function normalizeToolCalls(
  result: Awaited<ReturnType<typeof runAgent>>,
): NormalizedToolCall[] {
  const toolCalls = result.steps.flatMap(step => step.toolCalls) as ToolPart[];
  const toolResults = result.steps.flatMap(
    step => step.toolResults,
  ) as ToolPart[];

  return toolCalls.map(toolCall => {
    const toolResult = toolResults.find(
      resultPart => resultPart.toolCallId === toolCall.toolCallId,
    );

    return {
      id: toolCall.toolCallId ?? '',
      tool: toolCall.toolName ?? 'unknown',
      input: toolCall.input,
      output: toolResult?.output,
    };
  });
}
