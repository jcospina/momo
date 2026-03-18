


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."chat_message_status" AS ENUM (
    'pending',
    'processed',
    'failed',
    'no_expense',
    'needs_category'
);


ALTER TYPE "public"."chat_message_status" OWNER TO "postgres";


CREATE TYPE "public"."currency_type" AS ENUM (
    'EUR',
    'COP',
    'USD'
);


ALTER TYPE "public"."currency_type" OWNER TO "postgres";


CREATE TYPE "public"."language" AS ENUM (
    'en',
    'es'
);


ALTER TYPE "public"."language" OWNER TO "postgres";


COMMENT ON TYPE "public"."language" IS ' ';



CREATE OR REPLACE FUNCTION "public"."clean_expense_tags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
declare v text[];
begin
  -- if this is an UPDATE and tags didn’t change, do nothing
  if tg_op = 'UPDATE' and new.tags is not distinct from old.tags then
    return new;
  end if;

  if new.tags is null then
    new.tags := '{}';
  end if;

  -- normalize: lowercase, trim, validate, dedupe, and sort for stable order
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
$_$;


ALTER FUNCTION "public"."clean_expense_tags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_household_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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


ALTER FUNCTION "public"."enforce_household_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_invite_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'extensions'
    AS $$
begin
  if tg_op = 'INSERT' then
    -- always generate a fresh token on insert, ignore any client supplied value
    new.invite_token := encode(gen_random_bytes(16), 'hex');
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    -- make the token immutable
    if new.invite_token is distinct from old.invite_token then
      raise exception 'invite_token_immutable';
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_invite_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") RETURNS TABLE("role" "text", "display_name" "text", "email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    hm.role,
    up.display_name,
    up.email
  FROM public.household_members hm
  JOIN public.user_profiles up ON up.user_id = hm.user_id
  WHERE hm.household_id = p_household_id
    AND (SELECT auth.uid()) IS NOT NULL
    AND public.is_member_definer_uid(hm.household_id, (SELECT auth.uid())::uuid);
$$;


ALTER FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_share_link_info"("p_token" "text") RETURNS TABLE("household_id" "uuid", "household_name" "text", "inviter_name" "text", "member_count" integer, "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$with inviter as (
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
    i.display_name,
    c.member_count,
    case
      when i.household_id is null then 'no_household'
      when c.member_count >= 5 then 'household_full'
      else 'household_valid'
    end as status
  from inviter i
  left join public.households h on h.id = i.household_id
  left join counts c on c.household_id = i.household_id;$$;


ALTER FUNCTION "public"."get_share_link_info"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_label"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select coalesce(up.display_name, up.email)
  from public.user_profiles up
  where up.user_id = p_user_id
$$;


ALTER FUNCTION "public"."get_user_label"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member"("h" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select exists (
    select 1
    from public.household_members
    where household_id = h
      and user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_member"("h" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_definer"("h" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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


ALTER FUNCTION "public"."is_member_definer"("h" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare ok boolean;
begin
  select exists(
    select 1
    from public.household_members
    where household_id = h
      and user_id = u
  ) into ok;

  return ok;
end;
$$;


ALTER FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_uid"("h" "uuid", "u" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select exists (
    select 1
    from public.household_members
    where household_id = h
      and user_id = u
  );
$$;


ALTER FUNCTION "public"."is_member_uid"("h" "uuid", "u" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_multiple_households"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$begin
  if exists (
    select 1
    from public.household_members
    where user_id = new.user_id
  ) then
    raise exception 'user_has_a_household';
  end if;

  return new;
end;$$;


ALTER FUNCTION "public"."prevent_multiple_households"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "status" "public"."chat_message_status" DEFAULT 'pending'::"public"."chat_message_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sender_name" "text",
    "expense_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "amount_cents" bigint NOT NULL,
    "currency" "text" DEFAULT 'COP'::"text" NOT NULL,
    "expense_date" "date" NOT NULL,
    "merchant" "text",
    "category" "text" DEFAULT 'uncategorized'::"text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "chat_message_id" "uuid",
    CONSTRAINT "expenses_amount_cents_check" CHECK (("amount_cents" > 0))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."daily_totals_by_month" WITH ("security_invoker"='true') AS
 SELECT "household_id",
    "to_char"(("expense_date")::timestamp with time zone, 'YYYY-MM'::"text") AS "month",
    (EXTRACT(day FROM "expense_date"))::integer AS "day",
    "sum"("amount_cents") AS "total_cents",
    "sum"("sum"("amount_cents")) OVER (PARTITION BY "household_id", ("to_char"(("expense_date")::timestamp with time zone, 'YYYY-MM'::"text")) ORDER BY ((EXTRACT(day FROM "expense_date"))::integer)) AS "cumulative_cents"
   FROM "public"."expenses"
  GROUP BY "household_id", ("to_char"(("expense_date")::timestamp with time zone, 'YYYY-MM'::"text")), ((EXTRACT(day FROM "expense_date"))::integer);


ALTER VIEW "public"."daily_totals_by_month" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."household_members" (
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL
);


ALTER TABLE "public"."household_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."households" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."households" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_by_category" WITH ("security_invoker"='true') AS
 SELECT "household_id",
    "to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "category",
    "sum"("amount_cents") AS "total_cents"
   FROM "public"."expenses"
  GROUP BY "household_id", ("to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text")), "category";


ALTER VIEW "public"."monthly_by_category" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_by_category_user" WITH ("security_invoker"='true') AS
 SELECT "household_id",
    "to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    COALESCE("category", 'uncategorized'::"text") AS "category",
    "public"."get_user_label"("user_id") AS "user_label",
    "sum"("amount_cents") AS "total_cents"
   FROM "public"."expenses" "e"
  WHERE ((("household_id" IS NOT NULL) AND "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid"))) OR (("household_id" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))))
  GROUP BY "household_id", ("to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text")), COALESCE("category", 'uncategorized'::"text"), ("public"."get_user_label"("user_id"));


ALTER VIEW "public"."monthly_by_category_user" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_totals" WITH ("security_invoker"='true') AS
 SELECT "household_id",
    "to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "sum"("amount_cents") AS "total_cents"
   FROM "public"."expenses"
  GROUP BY "household_id", ("to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text"));


ALTER VIEW "public"."monthly_totals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."monthly_totals_by_user" WITH ("security_invoker"='true') AS
 SELECT "household_id",
    "public"."get_user_label"("user_id") AS "user_label",
    "to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "sum"("amount_cents") AS "total_cents"
   FROM "public"."expenses" "e"
  WHERE (("household_id" IS NOT NULL) AND "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid")))
  GROUP BY "household_id", ("public"."get_user_label"("user_id")), ("to_char"("date_trunc"('month'::"text", ("expense_date")::timestamp with time zone), 'YYYY-MM'::"text"));


ALTER VIEW "public"."monthly_totals_by_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_prefs" (
    "user_id" "uuid" NOT NULL,
    "onboarding_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "currency" "public"."currency_type" DEFAULT 'USD'::"public"."currency_type",
    "ai_enabled" boolean DEFAULT true NOT NULL,
    "language" "public"."language" DEFAULT 'en'::"public"."language",
    CONSTRAINT "user_prefs_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['unknown'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."user_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "username" "text",
    "invite_token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text" NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_pkey" PRIMARY KEY ("household_id", "user_id");



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_prefs"
    ADD CONSTRAINT "user_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_key" UNIQUE ("username");



CREATE INDEX "idx_chat_messages_household_created" ON "public"."chat_messages" USING "btree" ("household_id", "created_at");



CREATE INDEX "idx_chat_messages_status_pending" ON "public"."chat_messages" USING "btree" ("created_at") WHERE ("status" = 'pending'::"public"."chat_message_status");



CREATE INDEX "idx_chat_messages_user_created" ON "public"."chat_messages" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_expenses_chat_message_id" ON "public"."expenses" USING "btree" ("chat_message_id");



CREATE INDEX "idx_expenses_tags_gin" ON "public"."expenses" USING "gin" ("tags");



CREATE UNIQUE INDEX "one_household_per_user" ON "public"."household_members" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_expenses_clean_tags" BEFORE INSERT OR UPDATE OF "tags" ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."clean_expense_tags"();



CREATE OR REPLACE TRIGGER "trg_household_capacity" BEFORE INSERT ON "public"."household_members" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_household_capacity"();



CREATE OR REPLACE TRIGGER "trg_one_household" BEFORE INSERT ON "public"."household_members" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_multiple_households"();



CREATE OR REPLACE TRIGGER "trg_user_profiles_token" BEFORE INSERT OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_invite_token"();



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."household_members"
    ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."households"
    ADD CONSTRAINT "households_owner_fkey" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_prefs"
    ADD CONSTRAINT "user_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_delete" ON "public"."chat_messages" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "chat_messages_insert" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("household_id" IS NULL) OR "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "chat_messages_select" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING (((("household_id" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))) OR (("household_id" IS NOT NULL) AND "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "chat_messages_update" ON "public"."chat_messages" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_insert" ON "public"."expenses" FOR INSERT WITH CHECK (("public"."is_member_uid"("household_id", ( SELECT "auth"."uid"() AS "uid")) OR (("household_id" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "expenses_select" ON "public"."expenses" FOR SELECT USING (("public"."is_member_uid"("household_id", ( SELECT "auth"."uid"() AS "uid")) OR (("household_id" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "expenses_update_own" ON "public"."expenses" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."household_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."households" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "households_insert" ON "public"."households" FOR INSERT WITH CHECK (("owner" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "households_select" ON "public"."households" FOR SELECT USING ((("owner" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_member_uid"("id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "members_insert" ON "public"."household_members" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "members_select" ON "public"."household_members" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_member_definer_uid"("household_id", ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."user_prefs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_prefs_select" ON "public"."user_prefs" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_prefs_update" ON "public"."user_prefs" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_prefs_upsert" ON "public"."user_prefs" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_insert" ON "public"."user_profiles" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_profiles_select" ON "public"."user_profiles" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_profiles_update" ON "public"."user_profiles" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





























































































































































































GRANT ALL ON FUNCTION "public"."clean_expense_tags"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expense_tags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expense_tags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_household_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_household_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_household_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_invite_token"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_household_member_profiles"("p_household_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_share_link_info"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_share_link_info"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_label"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_label"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_label"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member"("h" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member"("h" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member"("h" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_member_definer"("h" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_member_definer"("h" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_definer"("h" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_definer"("h" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_uid"("h" "uuid", "u" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_uid"("h" "uuid", "u" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_uid"("h" "uuid", "u" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_multiple_households"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_multiple_households"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_multiple_households"() TO "service_role";
























GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."daily_totals_by_month" TO "anon";
GRANT ALL ON TABLE "public"."daily_totals_by_month" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_totals_by_month" TO "service_role";



GRANT ALL ON TABLE "public"."household_members" TO "anon";
GRANT ALL ON TABLE "public"."household_members" TO "authenticated";
GRANT ALL ON TABLE "public"."household_members" TO "service_role";



GRANT ALL ON TABLE "public"."households" TO "anon";
GRANT ALL ON TABLE "public"."households" TO "authenticated";
GRANT ALL ON TABLE "public"."households" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_by_category" TO "anon";
GRANT ALL ON TABLE "public"."monthly_by_category" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_by_category" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_by_category_user" TO "anon";
GRANT ALL ON TABLE "public"."monthly_by_category_user" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_by_category_user" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_totals" TO "anon";
GRANT ALL ON TABLE "public"."monthly_totals" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_totals" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_totals_by_user" TO "anon";
GRANT ALL ON TABLE "public"."monthly_totals_by_user" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_totals_by_user" TO "service_role";



GRANT ALL ON TABLE "public"."user_prefs" TO "anon";
GRANT ALL ON TABLE "public"."user_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


