#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Install it first and try again."
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "development" ]; then
  echo "Push blocked: migrations can only be applied from the 'development' branch."
  echo "Current branch: $current_branch"
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "SUPABASE_DB_PASSWORD is required."
  exit 1
fi

echo "Running required local migration preflight checks before hosted apply..."
supabase start
supabase db reset --local
supabase db lint --local
echo "Preflight checks passed."

echo "This will apply pending migrations to your linked hosted Supabase project."
echo "Single environment note: this impacts production immediately."
printf "Type APPLY to continue: "
read -r confirmation

if [ "$confirmation" != "APPLY" ]; then
  echo "Aborted."
  exit 1
fi

supabase db push --linked
