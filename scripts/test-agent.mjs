#!/usr/bin/env node

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();

const message = args.join(' ') || '@momo how much did I spend this month?';
const url =
  process.env.MOMO_AGENT_WS_URL ||
  'ws://localhost:8787/agents/momo-agent/local-dev';

const ws = new WebSocket(url);
const requestId = crypto.randomUUID();

ws.addEventListener('open', () => {
  console.log(`Sending to ${url}: "${message}"\n`);

  const userMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    parts: [{ type: 'text', text: message }],
  };

  ws.send(
    JSON.stringify({
      type: 'cf_agent_use_chat_request',
      id: requestId,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [userMessage] }),
      },
    }),
  );
});

ws.addEventListener('message', event => {
  const data = event.data;
  try {
    const parsed = JSON.parse(data);

    if (
      parsed.type === 'cf_agent_use_chat_response' &&
      parsed.id === requestId
    ) {
      process.stdout.write(parsed.body ?? '');
      if (parsed.done) {
        console.log('\n');
        ws.close();
      }
    }
  } catch {
    process.stdout.write(data);
  }
});

ws.addEventListener('close', () => {
  process.exit(0);
});

ws.addEventListener('error', err => {
  console.error('WebSocket error:', err.message);
  console.error('Make sure `pnpm agent:dev` is running first.');
  process.exit(1);
});

setTimeout(() => {
  console.error('\nTimed out waiting for the agent response.');
  ws.close();
  process.exit(1);
}, 60_000);
