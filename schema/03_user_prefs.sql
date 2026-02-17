-- 03_user_prefs.sql
-- User preferences table and RLS policies.

-- ============================================================================
-- Table
-- ============================================================================

create table public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_status text not null
    check (onboarding_status in ('unknown','completed','skipped'))
    default 'unknown',
  currency public.currency_type default 'USD',
  ai_enabled boolean not null default true,
  language public.language default 'en'
);
alter table public.user_prefs enable row level security;

-- ============================================================================
-- RLS Policies
-- ============================================================================

create policy user_prefs_select on public.user_prefs
for select using (user_id = (select auth.uid()));

create policy user_prefs_upsert on public.user_prefs
for insert with check (user_id = (select auth.uid()));

create policy user_prefs_update on public.user_prefs
for update using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
