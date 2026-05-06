/// <reference types="@cloudflare/workers-types" />

import { createOpenAI } from '@ai-sdk/openai';
import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat';
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@lib-types/user-preferences';
import {
  convertToModelMessages,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from 'ai';
import { streamAgent } from '@/agent/agent-core';
import type { AgentContext } from '@/agent/context';
import { mockToolExecutors } from '@/agent/tools/mock-executors';
import { productionToolExecutors } from '@/agent/tools/tools';

export type MomoAgentToolMode = 'mock' | 'production';

export interface MomoAgentEnv extends Cloudflare.Env {
  MomoAgent: DurableObjectNamespace;
  OPENAI_API_KEY: string;
  MOMO_AGENT_MODEL?: string;
  MOMO_AGENT_TOOL_MODE?: MomoAgentToolMode;
  MOMO_AGENT_DEFAULT_CURRENCY?: string;
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
      this.env.MOMO_AGENT_TOOL_MODE === 'production'
        ? productionToolExecutors
        : mockToolExecutors;
    // TODO(auth): replace env-based currency with getUserPreferences(userId)
    // once user identity flows into the durable object.
    const context: AgentContext = {
      currency: resolveDefaultCurrency(this.env.MOMO_AGENT_DEFAULT_CURRENCY),
    };

    const result = streamAgent({
      context,
      model,
      messages,
      onFinish,
      toolExecutors,
    });

    return result.toUIMessageStreamResponse();
  }
}

function resolveDefaultCurrency(raw: string | undefined): SupportedCurrency {
  if (raw && (SUPPORTED_CURRENCIES as readonly string[]).includes(raw)) {
    return raw as SupportedCurrency;
  }
  return 'USD';
}
