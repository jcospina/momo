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

mkdir -p schema

echo "Generating schema snapshot at schema/momo_snapshot.sql from linked project..."
supabase db dump --linked --schema public -f schema/momo_snapshot.sql
