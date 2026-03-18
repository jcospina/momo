#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is not installed. Install it first and try again."
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: pnpm db:new -- <migration_name>"
  exit 1
fi

supabase migration new "$1"
