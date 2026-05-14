import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type LocalSupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cached: LocalSupabaseEnv | null = null;

export function getLocalSupabaseEnv(): LocalSupabaseEnv {
  if (cached) return cached;

  loadEnvFiles(['.env.local', '.env']);

  const url = mustGetEnv('NEXT_PUBLIC_SUPABASE_URL');
  assertLocalSupabaseUrl(url);

  const anonKey = mustGetEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = resolveServiceRoleKey();

  cached = { url, anonKey, serviceRoleKey };
  return cached;
}

export function assertSupabaseRunning(): void {
  try {
    execSync('supabase status', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Local Supabase is not running. Start it with `pnpm db:start` and try again.',
    );
  }
}

function loadEnvFiles(files: string[]): void {
  for (const file of files) {
    const absPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absPath)) continue;
    const raw = fs.readFileSync(absPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const withoutExport = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed;
      const eq = withoutExport.indexOf('=');
      if (eq < 1) continue;
      const key = withoutExport.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let value = withoutExport.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function mustGetEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing ${key}. Set it in the shell or .env.local/.env before running this command.`,
    );
  }
  return value;
}

function assertLocalSupabaseUrl(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${urlString}`);
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  if (!isLocalHost) {
    throw new Error(
      `Refusing to target non-local Supabase (${parsed.origin}). Point NEXT_PUBLIC_SUPABASE_URL to local Supabase first.`,
    );
  }
}

function resolveServiceRoleKey(): string {
  const fromStatus = readLocalSupabaseEnvVar('SERVICE_ROLE_KEY');
  if (fromStatus) return fromStatus;
  return mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function readLocalSupabaseEnvVar(name: string): string | null {
  try {
    const output = execSync('supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const line = output
      .split(/\r?\n/)
      .find(entry => entry.startsWith(`${name}=`));
    if (!line) return null;

    const raw = line.slice(name.length + 1).trim();
    if (!raw) return null;

    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      return raw.slice(1, -1);
    }

    return raw;
  } catch {
    return null;
  }
}
