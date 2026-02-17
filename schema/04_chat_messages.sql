-- 04_chat_messages.sql
-- Chat messages table, indexes, and RLS policies.

-- ============================================================================
-- Table
-- ============================================================================

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  status public.chat_message_status not null default 'pending',
  created_at timestamptz default now(),
  sender_name text
);
alter table public.chat_messages enable row level security;

-- ============================================================================
-- Indexes
-- ============================================================================

create index idx_chat_messages_household_created
  on public.chat_messages (household_id, created_at);

create index idx_chat_messages_status_pending
  on public.chat_messages (created_at)
  where status = 'pending';

create index idx_chat_messages_user_created
  on public.chat_messages (user_id, created_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

create policy chat_messages_select on public.chat_messages
  for select
  to authenticated
  using (
    (household_id is null and user_id = (select auth.uid()))
    or (
      household_id is not null
      and public.is_member_definer_uid(household_id, (select auth.uid()))
    )
  );

create policy chat_messages_insert on public.chat_messages
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      household_id is null
      or public.is_member_definer_uid(household_id, (select auth.uid()))
    )
  );

create policy chat_messages_update on public.chat_messages
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy chat_messages_delete on public.chat_messages
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
