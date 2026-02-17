-- 05_expenses.sql
-- Expenses table, tag-cleaning trigger, GIN index, and RLS policies.

-- ============================================================================
-- Table
-- ============================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  chat_message_id uuid references public.chat_messages(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'COP',
  expense_date date not null,
  merchant text,
  category text default 'uncategorized',
  note text,
  created_at timestamptz default now(),
  tags text[] not null default '{}'
);
alter table public.expenses enable row level security;

-- ============================================================================
-- Function — trigger
-- ============================================================================

create or replace function public.clean_expense_tags()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare v text[];
begin
  if tg_op = 'UPDATE' and new.tags is not distinct from old.tags then
    return new;
  end if;

  if new.tags is null then
    new.tags := '{}';
  end if;

  select coalesce(array_agg(distinct t order by t), '{}') into v
  from (
    select lower(trim(x)) as t
    from unnest(new.tags) x
    where x is not null
      and btrim(x) <> ''
      and lower(trim(x)) ~ '^[a-z0-9_]{1,32}$'
  ) s;

  new.tags := v;
  return new;
end;
$$;

-- ============================================================================
-- Trigger
-- ============================================================================

create trigger trg_expenses_clean_tags
before insert or update of tags on public.expenses
for each row execute function public.clean_expense_tags();

-- ============================================================================
-- Index
-- ============================================================================

create index idx_expenses_tags_gin
  on public.expenses using gin (tags);

-- ============================================================================
-- RLS Policies
-- ============================================================================

create policy expenses_select on public.expenses
for select using (
  public.is_member_uid(household_id, (select auth.uid()))
  or (household_id is null and user_id = (select auth.uid()))
);

create policy expenses_insert on public.expenses
for insert with check (
  public.is_member_uid(household_id, (select auth.uid()))
  or (household_id is null and user_id = (select auth.uid()))
);

create policy expenses_update_own on public.expenses
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
