BEGIN;

-- Required for diacritic stripping (matches normalize('NFD').replace(/[̀-ͯ]/g, '') in JS).
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- The existing clean_expense_tags trigger validates each tag against
-- ^[a-z0-9_]{1,32}$, which silently drops every multi-word n-gram. Relax it
-- to allow single-space-separated n-grams (matching the deterministic output
-- of extractTagNgrams in src/lib/helpers/expenses/expense-category.ts).
CREATE OR REPLACE FUNCTION "public"."clean_expense_tags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
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
      and lower(trim(x)) ~ '^[a-z0-9_]+( [a-z0-9_]+)*$'
      and char_length(lower(trim(x))) <= 64
  ) s;

  new.tags := v;
  return new;
end;
$_$;

-- Disposable helper that mirrors extractTagNgrams() in
-- src/lib/helpers/expenses/expense-category.ts. Operates on note only —
-- merchant is usually null on real data and is not part of the tag source.
-- Dropped at the end.
CREATE OR REPLACE FUNCTION "public"."__extract_tag_ngrams"(
  p_note text,
  p_max int DEFAULT 3
) RETURNS text[]
    LANGUAGE "plpgsql"
    IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  raw_text text;
  tokens text[];
  result text[] := ARRAY[]::text[];
  seen text[] := ARRAY[]::text[];
  win_size int;
  i int;
  total int;
  ngram text;
BEGIN
  raw_text := lower(coalesce(p_note, ''));
  raw_text := unaccent(raw_text);
  raw_text := regexp_replace(raw_text, '\m\d+(\.\d+)?[kKmM]?\M', ' ', 'g');
  raw_text := regexp_replace(raw_text, '[^a-z0-9[:space:]]', ' ', 'g');
  tokens := regexp_split_to_array(btrim(raw_text), '\s+');
  tokens := array_remove(tokens, '');
  total := coalesce(array_length(tokens, 1), 0);

  IF total = 0 THEN
    RETURN ARRAY[]::text[];
  END IF;

  FOR win_size IN 1..LEAST(p_max, total) LOOP
    FOR i IN 1..(total - win_size + 1) LOOP
      ngram := array_to_string(tokens[i:i + win_size - 1], ' ');
      IF NOT (ngram = ANY (seen)) THEN
        seen := array_append(seen, ngram);
        result := array_append(result, ngram);
      END IF;
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$;

-- Backfill every row. Skipped rows where the helper returns the same array
-- (e.g. already-correct rows) thanks to the guard at the top of clean_expense_tags.
UPDATE "public"."expenses"
SET "tags" = "public"."__extract_tag_ngrams"("note");

DROP FUNCTION "public"."__extract_tag_ngrams"(text, int);

COMMIT;
