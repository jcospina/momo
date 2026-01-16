'use client';

type ClientLogLevel = 'info' | 'warn' | 'error';

type ClientLogPayload = {
  level: ClientLogLevel;
  message: string;
  context?: Record<string, unknown>;
};

async function sendLog(payload: ClientLogPayload) {
  try {
    await fetch('/api/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // swallow logging failures
  }
}

export function clientLog(
  level: ClientLogLevel,
  message: string,
  context?: Record<string, unknown>,
) {
  if (level === 'error') {
    console.error(message, context);
  } else if (level === 'warn') {
    console.warn(message, context);
  } else {
    console.info(message, context);
  }
  sendLog({
    level,
    message,
    context,
  });
}
