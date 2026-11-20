-- Fixed member colours. Every household member keeps one colour slot (1–5)
-- for as long as they stay in the household, so the same person is the same
-- colour in chat avatars, the profile page and every member chart. The slot
-- is stored rather than derived from an ordering: a derived order would
-- repaint existing members whenever someone joins or leaves.

ALTER TABLE "public"."household_members"
  ADD COLUMN "color_slot" smallint;

-- Backfill existing households: owner first, then by profile age.
WITH "ranked" AS (
  SELECT
    "hm"."household_id",
    "hm"."user_id",
    row_number() OVER (
      PARTITION BY "hm"."household_id"
      ORDER BY ("hm"."role" = 'owner') DESC, "up"."created_at" NULLS LAST, "hm"."user_id"
    ) AS "slot"
  FROM "public"."household_members" "hm"
  LEFT JOIN "public"."user_profiles" "up" ON "up"."user_id" = "hm"."user_id"
)
UPDATE "public"."household_members" "hm"
SET "color_slot" = "ranked"."slot"
FROM "ranked"
WHERE "ranked"."household_id" = "hm"."household_id"
  AND "ranked"."user_id" = "hm"."user_id";

ALTER TABLE "public"."household_members"
  ALTER COLUMN "color_slot" SET NOT NULL;

ALTER TABLE "public"."household_members"
  ADD CONSTRAINT "household_members_color_slot_unique"
  UNIQUE ("household_id", "color_slot");

-- NOT VALID: households created before capacity was enforced for client
-- inserts can hold more than five members and keep their backfilled slots.
ALTER TABLE "public"."household_members"
  ADD CONSTRAINT "household_members_color_slot_range"
  CHECK ("color_slot" BETWEEN 1 AND 5) NOT VALID;

-- New members always get the smallest free slot; any client-sent value is
-- ignored. Runs after trg_household_capacity (triggers fire by name), which
-- already rejects a sixth member.
CREATE OR REPLACE FUNCTION "public"."assign_household_color_slot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare free_slot smallint;
begin
  if new.household_id is null then
    return new;
  end if;

  -- Serialise joins per household so two members never claim one slot.
  perform 1 from public.households where id = new.household_id for update;

  select s::smallint into free_slot
  from generate_series(1, 5) as s
  where not exists (
    select 1
    from public.household_members hm
    where hm.household_id = new.household_id
      and hm.color_slot = s
  )
  order by s
  limit 1;

  if free_slot is null then
    raise exception 'household_full';
  end if;

  new.color_slot := free_slot;
  return new;
end;
$$;

ALTER FUNCTION "public"."assign_household_color_slot"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."assign_household_color_slot"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."assign_household_color_slot"() TO "authenticated", "service_role";

CREATE OR REPLACE TRIGGER "trg_household_color_slot"
  BEFORE INSERT ON "public"."household_members"
  FOR EACH ROW EXECUTE FUNCTION "public"."assign_household_color_slot"();

-- Members list: append user id and slot (existing columns keep their order,
-- so callers reading by name are unaffected). The return type changes, so the
-- function is dropped and recreated with the same grants as before.
DROP FUNCTION IF EXISTS "public"."get_household_member_profiles"("uuid");

CREATE FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid")
RETURNS TABLE("role" "text", "display_name" "text", "email" "text", "user_id" "uuid", "color_slot" smallint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    hm.role,
    up.display_name,
    up.email,
    hm.user_id,
    hm.color_slot
  FROM public.household_members hm
  JOIN public.user_profiles up ON up.user_id = hm.user_id
  WHERE hm.household_id = p_household_id
    AND (SELECT auth.uid()) IS NOT NULL
    AND public.is_member_definer_uid(hm.household_id, (SELECT auth.uid())::uuid)
  ORDER BY hm.color_slot;
$$;

ALTER FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") TO "authenticated", "service_role";

-- Stats by category and member: append the author's id and colour slot so
-- charts colour members by identity instead of by display name. Existing
-- columns are unchanged; rows are now split per author id (two members with
-- the same label no longer merge). Authors who left the household get a null
-- slot.
CREATE OR REPLACE VIEW "public"."monthly_by_category_user" WITH ("security_invoker" = 'true') AS
SELECT
    "e"."household_id",
    "to_char"("date_trunc"('month'::"text", "e"."expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    COALESCE("e"."category", 'uncategorized'::"text") AS "category",
    "public"."get_user_label"("e"."user_id") AS "user_label",
    "sum"("e"."amount_cents") AS "total_cents",
    "e"."user_id",
    "hm"."color_slot"
FROM "public"."expenses" "e"
LEFT JOIN "public"."household_members" "hm"
    ON "hm"."household_id" = "e"."household_id"
    AND "hm"."user_id" = "e"."user_id"
WHERE
    (
        (
            "e"."household_id" IS NOT NULL
            AND "public"."is_member_definer_uid"(
                "e"."household_id",
                (
                    SELECT
                        "auth"."uid"() AS "uid"
                )
            )
        )
        OR (
            "e"."household_id" IS NULL
            AND "e"."user_id" = (
                SELECT
                    "auth"."uid"() AS "uid"
            )
        )
    )
    AND "e"."category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "e"."household_id",
    ("to_char"("date_trunc"('month'::"text", "e"."expense_date"::timestamp with time zone), 'YYYY-MM'::"text")),
    COALESCE("e"."category", 'uncategorized'::"text"),
    ("public"."get_user_label"("e"."user_id")),
    "e"."user_id",
    "hm"."color_slot";
