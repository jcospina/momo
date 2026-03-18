#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Install it first and try again."
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "development" ]; then
  echo "Dry-run blocked: migrations can only be pushed from the 'development' branch."
  echo "Current branch: $current_branch"
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "SUPABASE_DB_PASSWORD is required."
  exit 1
fi

echo "Running dry-run migration push against linked Supabase project..."
supabase db push --linked --dry-run
