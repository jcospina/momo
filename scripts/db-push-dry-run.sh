#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Install it first and try again."
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "SUPABASE_DB_PASSWORD is required."
  exit 1
fi

echo "Running dry-run migration push against linked Supabase project..."
supabase db push --linked --dry-run
