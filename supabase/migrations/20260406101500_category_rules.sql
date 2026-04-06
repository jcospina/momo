CREATE TABLE IF NOT EXISTS "public"."category_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "normalized_text" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "idx_category_rules_personal_text"
ON "public"."category_rules" USING "btree" ("user_id", "normalized_text")
WHERE ("household_id" IS NULL);

CREATE UNIQUE INDEX "idx_category_rules_household_text"
ON "public"."category_rules" USING "btree" ("household_id", "normalized_text")
WHERE ("household_id" IS NOT NULL);

CREATE OR REPLACE FUNCTION "public"."upsert_category_rule"(
    "p_user_id" "uuid",
    "p_household_id" "uuid",
    "p_normalized_text" "text",
    "p_category" "text"
) RETURNS void
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF p_household_id IS NOT NULL THEN
    INSERT INTO "public"."category_rules" ("user_id", "household_id", "normalized_text", "category")
    VALUES (p_user_id, p_household_id, p_normalized_text, p_category)
    ON CONFLICT ("household_id", "normalized_text") WHERE "household_id" IS NOT NULL
    DO UPDATE
    SET
      "category" = EXCLUDED."category",
      "user_id" = EXCLUDED."user_id",
      "updated_at" = "now"();
  ELSE
    INSERT INTO "public"."category_rules" ("user_id", "normalized_text", "category")
    VALUES (p_user_id, p_normalized_text, p_category)
    ON CONFLICT ("user_id", "normalized_text") WHERE "household_id" IS NULL
    DO UPDATE
    SET
      "category" = EXCLUDED."category",
      "updated_at" = "now"();
  END IF;
END;
$$;

ALTER FUNCTION "public"."upsert_category_rule"("p_user_id" "uuid", "p_household_id" "uuid", "p_normalized_text" "text", "p_category" "text") OWNER TO "postgres";

ALTER TABLE "public"."category_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_rules_select" ON "public"."category_rules" FOR SELECT TO "authenticated" USING (((
    ("household_id" IS NULL)
    AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))
) OR (
    ("household_id" IS NOT NULL)
    AND "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid"))
)));

CREATE POLICY "category_rules_insert" ON "public"."category_rules" FOR INSERT TO "authenticated" WITH CHECK ((
    ("user_id" = ( SELECT "auth"."uid"() AS "uid"))
    AND (("household_id" IS NULL) OR "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid")))
));

CREATE POLICY "category_rules_update" ON "public"."category_rules" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

GRANT ALL ON FUNCTION "public"."upsert_category_rule"("p_user_id" "uuid", "p_household_id" "uuid", "p_normalized_text" "text", "p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_category_rule"("p_user_id" "uuid", "p_household_id" "uuid", "p_normalized_text" "text", "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_category_rule"("p_user_id" "uuid", "p_household_id" "uuid", "p_normalized_text" "text", "p_category" "text") TO "service_role";

GRANT ALL ON TABLE "public"."category_rules" TO "anon";
GRANT ALL ON TABLE "public"."category_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."category_rules" TO "service_role";
