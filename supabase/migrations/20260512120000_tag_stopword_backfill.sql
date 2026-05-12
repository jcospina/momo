BEGIN;

-- Required for diacritic stripping (matches normalize('NFD').replace(/[̀-ͯ]/g, '') in JS).
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Disposable v2 helper that mirrors extractTagNgrams() in
-- src/lib/helpers/expenses/expense-category.ts after the stop-word filter was
-- added in src/lib/helpers/expenses/tag-stop-words.ts. Stop words are dropped
-- at the token level, before n-gram windowing, so cross-stop-word n-grams
-- (e.g. "groceries costco" from "groceries at costco") survive while
-- pure-stop unigrams/n-grams do not. Dropped at the end of this migration.
CREATE OR REPLACE FUNCTION "public"."__extract_tag_ngrams_v2"(
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
  stop_words text[] := ARRAY[
    'a','an','the','and','or','but','at','in','on','of','to','for','with',
    'el','la','los','las','un','una','y','o','de','en','con','por'
  ];
  filtered text[] := ARRAY[]::text[];
  tok text;
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

  FOREACH tok IN ARRAY tokens LOOP
    IF NOT (tok = ANY (stop_words)) THEN
      filtered := array_append(filtered, tok);
    END IF;
  END LOOP;

  total := coalesce(array_length(filtered, 1), 0);

  IF total = 0 THEN
    RETURN ARRAY[]::text[];
  END IF;

  FOR win_size IN 1..LEAST(p_max, total) LOOP
    FOR i IN 1..(total - win_size + 1) LOOP
      ngram := array_to_string(filtered[i:i + win_size - 1], ' ');
      IF NOT (ngram = ANY (seen)) THEN
        seen := array_append(seen, ngram);
        result := array_append(result, ngram);
      END IF;
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$;

-- Backfill every row. The clean_expense_tags BEFORE trigger no-ops when
-- new.tags is not distinct from old.tags, so rows that already match the
-- new shape are effectively skipped.
UPDATE "public"."expenses"
SET "tags" = "public"."__extract_tag_ngrams_v2"("note");

DROP FUNCTION "public"."__extract_tag_ngrams_v2"(text, int);

COMMIT;
