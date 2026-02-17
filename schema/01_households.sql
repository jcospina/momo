-- 01_households.sql
-- Household tables, membership helpers, constraint triggers, and RLS policies.
-- households and household_members are co-located because their RLS policies
-- reference is_member_uid / is_member_definer_uid which query household_members,
-- creating a circular dependency if split into separate files.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner uuid not null references auth.users(id),
  created_at timestamptz default now()
);
alter table public.households enable row level security;

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  primary key (household_id, user_id)
);
alter table public.household_members enable row level security;

-- ============================================================================
-- Functions — membership helpers (used by RLS across multiple tables)
-- ============================================================================

create or replace function public.is_member(h uuid)
returns boolean
language sql stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = h
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_member_definer(h uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare ok boolean;
begin
  select exists(
    select 1
    from public.household_members
    where household_id = h
      and user_id = auth.uid()
  ) into ok;
  return ok;
end;
$$;

create or replace function public.is_member_uid(h uuid, u uuid)
returns boolean
language sql stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = u
  );
$$;

create or replace function public.is_member_definer_uid(h uuid, u uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare ok boolean;
begin
  select exists(
    select 1
    from public.household_members
    where household_id = h and user_id = u
  ) into ok;
  return ok;
end;
$$;

-- ============================================================================
-- Functions — constraint enforcement
-- ============================================================================

create or replace function public.prevent_multiple_households()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.household_members where user_id = new.user_id) then
    raise exception 'user_has_a_household';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_household_capacity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare member_count int;
begin
  if new.household_id is null then
    return new;
  end if;

  perform 1 from public.households where id = new.household_id for update;

  select count(*) into member_count
  from public.household_members
  where household_id = new.household_id;

  if member_count >= 5 then
    raise exception 'household_full';
  end if;

  return new;
end;
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

create trigger trg_one_household
before insert on public.household_members
for each row execute function public.prevent_multiple_households();

create trigger trg_household_capacity
before insert on public.household_members
for each row execute function public.enforce_household_capacity();

-- ============================================================================
-- Indexes
-- ============================================================================

create unique index one_household_per_user
  on public.household_members (user_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

create policy households_select on public.households
for select using (
  owner = (select auth.uid())
  or public.is_member_uid(id, (select auth.uid()))
);

create policy households_insert on public.households
for insert with check (
  owner = (select auth.uid())
);

create policy members_select on public.household_members
for select using (
  user_id = (select auth.uid())
  or public.is_member_definer_uid(household_id, (select auth.uid()))
);

create policy members_insert on public.household_members
for insert with check ((select auth.uid()) = user_id);
