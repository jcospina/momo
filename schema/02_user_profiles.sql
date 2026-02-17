-- 02_user_profiles.sql
-- User profiles table, invite-token trigger, label/share-link helpers, and RLS policies.

-- ============================================================================
-- Table
-- ============================================================================

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  invite_token text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text not null unique
);
alter table public.user_profiles enable row level security;

-- ============================================================================
-- Functions — trigger
-- ============================================================================

create or replace function public.ensure_invite_token()
returns trigger
language plpgsql
set search_path = pg_catalog, public, extensions
as $$
begin
  if tg_op = 'INSERT' then
    new.invite_token := encode(gen_random_bytes(16), 'hex');
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    if new.invite_token is distinct from old.invite_token then
      raise exception 'invite_token_immutable';
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

-- ============================================================================
-- Functions — helpers
-- ============================================================================

create or replace function public.get_user_label(p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce(up.display_name, up.email)
  from public.user_profiles up
  where up.user_id = p_user_id
$$;

create function public.get_share_link_info(p_token text)
returns table (
  household_id uuid,
  household_name text,
  inviter_name text,
  member_count integer,
  status text
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  with inviter as (
    select
      up.user_id,
      up.invite_token,
      up.display_name,
      hm.household_id
    from public.user_profiles up
    left join public.household_members hm on hm.user_id = up.user_id
    where up.invite_token = p_token
    limit 1
  ),
  counts as (
    select
      i.household_id,
      coalesce((
        select count(*)
        from public.household_members hm
        where hm.household_id = i.household_id
      ), 0) as member_count
    from inviter i
  )
  select
    i.household_id,
    h.name as household_name,
    i.display_name as inviter_name,
    c.member_count,
    case
      when i.household_id is null then 'no_household'
      when c.member_count >= 5 then 'household_full'
      else 'household_valid'
    end as status
  from inviter i
  left join public.households h on h.id = i.household_id
  left join counts c on c.household_id = i.household_id;
$$;

create or replace function public.get_household_member_profiles(p_household_id uuid)
returns table (
  role text,
  display_name text,
  email text
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select
    hm.role,
    up.display_name,
    up.email
  from public.household_members hm
  join public.user_profiles up on up.user_id = hm.user_id
  where hm.household_id = p_household_id
    and (select auth.uid()) is not null
    and public.is_member_definer_uid(hm.household_id, (select auth.uid())::uuid);
$$;

-- ============================================================================
-- Trigger
-- ============================================================================

create trigger trg_user_profiles_token
before insert or update on public.user_profiles
for each row execute function public.ensure_invite_token();

-- ============================================================================
-- RLS Policies
-- ============================================================================

create policy user_profiles_select on public.user_profiles
for select using (user_id = (select auth.uid()));

create policy user_profiles_insert on public.user_profiles
for insert with check (user_id = (select auth.uid()));

create policy user_profiles_update on public.user_profiles
for update using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
