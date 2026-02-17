-- 06_views.sql
-- Aggregate views for stats. Depend on expenses table and helper functions
-- from earlier files (get_user_label, is_member_definer_uid).

create view public.monthly_by_category
  with (security_invoker = true) as
select
  household_id,
  to_char(date_trunc('month', expense_date), 'YYYY-MM') as month,
  category,
  sum(amount_cents) as total_cents
from public.expenses
group by
  household_id,
  to_char(date_trunc('month', expense_date), 'YYYY-MM'),
  category;

create view public.monthly_totals
  with (security_invoker = true) as
select
  household_id,
  to_char(date_trunc('month', expense_date), 'YYYY-MM') as month,
  sum(amount_cents) as total_cents
from public.expenses
group by
  household_id,
  to_char(date_trunc('month', expense_date), 'YYYY-MM');

create view public.monthly_totals_by_user
  with (security_invoker = true) as
select
  e.household_id,
  public.get_user_label(e.user_id) as user_label,
  to_char(date_trunc('month', e.expense_date), 'YYYY-MM') as month,
  sum(e.amount_cents) as total_cents
from public.expenses e
where
  e.household_id is not null
  and public.is_member_definer_uid(e.household_id, (select auth.uid()))
group by
  e.household_id,
  public.get_user_label(e.user_id),
  to_char(date_trunc('month', e.expense_date), 'YYYY-MM');

create view public.monthly_by_category_user
  with (security_invoker = true) as
select
  e.household_id,
  to_char(date_trunc('month', e.expense_date), 'YYYY-MM') as month,
  coalesce(e.category, 'uncategorized') as category,
  public.get_user_label(e.user_id) as user_label,
  sum(e.amount_cents) as total_cents
from public.expenses e
where
  e.household_id is not null
  and public.is_member_definer_uid(e.household_id, (select auth.uid()))
group by
  e.household_id,
  to_char(date_trunc('month', e.expense_date), 'YYYY-MM'),
  coalesce(e.category, 'uncategorized'),
  public.get_user_label(e.user_id);

create view public.daily_totals_by_month
  with (security_invoker = true) as
select
  household_id,
  to_char(expense_date, 'YYYY-MM') as month,
  extract(day from expense_date)::int as day,
  sum(amount_cents) as total_cents,
  sum(sum(amount_cents)) over (
    partition by household_id, to_char(expense_date, 'YYYY-MM')
    order by extract(day from expense_date)::int
  ) as cumulative_cents
from public.expenses
group by
  household_id,
  to_char(expense_date, 'YYYY-MM'),
  extract(day from expense_date)::int;
