import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  type StreamTextOnFinishCallback,
  stepCountIs,
  streamText,
  type ToolSet,
} from 'ai';
import { SYSTEM_PROMPT } from './constants';
import {
  type AgentToolExecutors,
  buildAgentTools,
  productionToolExecutors,
} from './tools/tools';

const DEFAULT_MAX_STEPS = 5;

type AgentArgs = {
  model: LanguageModel;
  messages: ModelMessage[];
  system?: string;
  maxSteps?: number;
  toolExecutors?: AgentToolExecutors;
};

type StreamAgentArgs = AgentArgs & {
  onFinish?: StreamTextOnFinishCallback<ToolSet>;
};

export function streamAgent({
  maxSteps = DEFAULT_MAX_STEPS,
  messages,
  model,
  onFinish,
  system = SYSTEM_PROMPT,
  toolExecutors = productionToolExecutors,
}: StreamAgentArgs) {
  const tools = buildAgentTools(toolExecutors);

  return streamText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    onFinish: onFinish as StreamTextOnFinishCallback<typeof tools> | undefined,
  });
}

export async function runAgent({
  maxSteps = DEFAULT_MAX_STEPS,
  messages,
  model,
  system = SYSTEM_PROMPT,
  toolExecutors = productionToolExecutors,
}: AgentArgs) {
  const result = await generateText({
    model,
    system,
    messages,
    tools: buildAgentTools(toolExecutors),
    stopWhen: stepCountIs(maxSteps),
  });

  return {
    text: result.text,
    steps: result.steps,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
  };
}
