-- Expense categories must be lowercase identifiers (e.g. 'groceries',
-- 'self_care', 'uncategorized').
--
-- Categories are shown to every household member (stats charts, MoMo answers)
-- and users can write them directly through PostgREST, so the database refuses
-- free text such as HTML. category_rules gets the same rule because its
-- categories are copied onto new household expenses.
--
-- Existing rows already matched on local and hosted databases when this was
-- written, so both constraints are validated right away. VALIDATE runs as a
-- separate step so the table is not locked for writes during the scan.
--
-- Reversal (manual; project convention has no .down.sql):
--   ALTER TABLE public.expenses DROP CONSTRAINT expenses_category_format_check;
--   ALTER TABLE public.category_rules DROP CONSTRAINT category_rules_category_format_check;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_category_format_check"
  CHECK ("category" IS NULL OR "category" ~ '^[a-z_]{1,32}$') NOT VALID;

ALTER TABLE "public"."expenses"
  VALIDATE CONSTRAINT "expenses_category_format_check";

ALTER TABLE "public"."category_rules"
  ADD CONSTRAINT "category_rules_category_format_check"
  CHECK ("category" ~ '^[a-z_]{1,32}$') NOT VALID;

ALTER TABLE "public"."category_rules"
  VALIDATE CONSTRAINT "category_rules_category_format_check";
