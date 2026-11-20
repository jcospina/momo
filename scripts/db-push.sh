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

echo "Running required local migration preflight checks before hosted apply..."
supabase start
supabase db reset
supabase db lint
echo "Preflight checks passed."

echo "This will apply pending migrations to your linked hosted Supabase project."
echo "Single environment note: this impacts production immediately."
printf "Type APPLY to continue: "
read -r confirmation

if [ "$confirmation" != "APPLY" ]; then
  echo "Aborted."
  exit 1
fi

# The APPLY prompt above is the confirmation; --yes stops CLI v3 from asking a
# second time (its own prompt defaults to No).
supabase db push --remote --yes
