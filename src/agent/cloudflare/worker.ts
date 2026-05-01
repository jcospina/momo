/// <reference types="@cloudflare/workers-types" />

import { routeAgentRequest } from 'agents';
import { MomoAgent, type MomoAgentEnv } from './momo-agent';

export { MomoAgent };

export default {
  async fetch(request: Request, env: MomoAgentEnv) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response('Not found', { status: 404 })
    );
  },
} satisfies ExportedHandler<MomoAgentEnv>;
