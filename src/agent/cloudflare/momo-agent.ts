/// <reference types="@cloudflare/workers-types" />

import { createOpenAI } from '@ai-sdk/openai';
import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat';
import {
  convertToModelMessages,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from 'ai';
import { streamAgent } from '@/agent/agent-core';
import { mockToolExecutors } from '@/agent/tools/mock-executors';
import { productionToolExecutors } from '@/agent/tools/tools';

export type MomoAgentToolMode = 'mock' | 'stub';

export interface MomoAgentEnv extends Cloudflare.Env {
  MomoAgent: DurableObjectNamespace;
  OPENAI_API_KEY: string;
  MOMO_AGENT_MODEL?: string;
  MOMO_AGENT_TOOL_MODE?: MomoAgentToolMode;
}

export class MomoAgent extends AIChatAgent<MomoAgentEnv> {
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: OnChatMessageOptions,
  ) {
    const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });
    const model = openai(this.env.MOMO_AGENT_MODEL ?? 'gpt-5.4-mini');
    const messages = await convertToModelMessages(this.messages);
    const toolExecutors =
      this.env.MOMO_AGENT_TOOL_MODE === 'mock'
        ? mockToolExecutors
        : productionToolExecutors;

    const result = streamAgent({
      model,
      messages,
      onFinish,
      toolExecutors,
    });

    return result.toUIMessageStreamResponse();
  }
}
