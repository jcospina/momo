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

if find supabase/migrations -type f -name '*.sql' -print -quit | grep -q .; then
  echo "Baseline blocked: supabase/migrations already contains SQL files."
  echo "This command is intended for one-time baseline bootstrap only."
  exit 1
fi

name="${1:-baseline_$(date +%Y%m%d%H%M%S)}"

echo "Pulling current hosted schema into supabase/migrations as: $name"
echo "When prompted to update remote migration history, answer 'Y'."
supabase db pull "$name"
