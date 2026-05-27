import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
} from 'ai';
import { buildSystemPrompt } from './constants';
import type { AgentContext } from './context';
import {
  type AgentToolExecutors,
  buildAgentTools,
  productionToolExecutors,
} from './tools/tools';

const DEFAULT_MAX_STEPS = 5;

type AgentArgs = {
  model: LanguageModel;
  messages: ModelMessage[];
  context: AgentContext;
  system?: string;
  maxSteps?: number;
  toolExecutors?: AgentToolExecutors;
};

type StreamAgentArgs = AgentArgs & {
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
};

export function streamAgent({
  context,
  maxSteps = DEFAULT_MAX_STEPS,
  messages,
  model,
  onFinish,
  system,
  toolExecutors = productionToolExecutors,
}: StreamAgentArgs) {
  const tools = buildAgentTools(toolExecutors, context);

  return streamText({
    model,
    system: system ?? buildSystemPrompt(context),
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    onFinish: onFinish as StreamTextOnFinishCallback<typeof tools> | undefined,
  });
}

export async function runAgent({
  context,
  maxSteps = DEFAULT_MAX_STEPS,
  messages,
  model,
  system,
  toolExecutors = productionToolExecutors,
}: AgentArgs) {
  const result = await generateText({
    model,
    system: system ?? buildSystemPrompt(context),
    messages,
    tools: buildAgentTools(toolExecutors, context),
    stopWhen: stepCountIs(maxSteps),
  });

  return {
    text: result.text,
    steps: result.steps,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
  };
}
