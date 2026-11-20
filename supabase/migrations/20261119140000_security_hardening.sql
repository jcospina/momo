-- Security hardening for RLS policies, SECURITY DEFINER functions and grants.
-- Rationale: docs/adr/009-database-enforced-access-rules.md
--
-- Only future writes are affected: existing rows are not rewritten, and the new
-- role check constraint is NOT VALID so it cannot fail on legacy data.
--
-- Reversal (manual; project convention has no .down.sql): restore the policies,
-- functions and grants from 20260318162958_baseline and 20260406101500_category_rules,
-- then drop join_household_with_invite, guard_user_prefs_ai_enabled,
-- sync_user_profile_email, their triggers and household_members_role_check.


-- ---------------------------------------------------------------------------
-- 1. Household joins
-- ---------------------------------------------------------------------------

-- The membership triggers ran as the joining user, so RLS hid the household's
-- existing members: the capacity count was always 0 and the FOR UPDATE lock
-- matched no row. Running them as definer makes them see every member.
ALTER FUNCTION "public"."enforce_household_capacity"() SECURITY DEFINER;
ALTER FUNCTION "public"."prevent_multiple_households"() SECURITY DEFINER;

ALTER TABLE "public"."household_members"
  ADD CONSTRAINT "household_members_role_check"
  CHECK ("role" = ANY (ARRAY['owner'::"text", 'member'::"text"])) NOT VALID;

-- Users may only insert themselves directly as the owner of a household they
-- created. Joining someone else's household goes through
-- join_household_with_invite, which checks the invite token.
DROP POLICY IF EXISTS "members_insert" ON "public"."household_members";

CREATE POLICY "members_insert_owner" ON "public"."household_members"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND "role" = 'owner'
    AND EXISTS (
      SELECT 1
      FROM "public"."households" "h"
      WHERE "h"."id" = "household_members"."household_id"
        AND "h"."owner" = (SELECT "auth"."uid"())
    )
  );

CREATE OR REPLACE FUNCTION "public"."join_household_with_invite"("p_token" "text")
RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT hm.household_id INTO v_household_id
  FROM public.user_profiles up
  JOIN public.household_members hm ON hm.user_id = up.user_id
  WHERE up.invite_token = p_token;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  -- trg_one_household and trg_household_capacity raise user_has_a_household
  -- and household_full.
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (v_household_id, v_user_id, 'member');

  RETURN v_household_id;
END;
$$;

ALTER FUNCTION "public"."join_household_with_invite"("p_token" "text") OWNER TO "postgres";


-- ---------------------------------------------------------------------------
-- 2. ai_enabled is admin-managed
-- ---------------------------------------------------------------------------

-- API users (anon/authenticated) can neither set nor change ai_enabled. The
-- service role and database owners (dashboard, SQL editor) still can.
CREATE OR REPLACE FUNCTION "public"."guard_user_prefs_ai_enabled"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN new;
  END IF;

  IF tg_op = 'INSERT' THEN
    new.ai_enabled := false;
  ELSIF new.ai_enabled IS DISTINCT FROM old.ai_enabled THEN
    RAISE EXCEPTION 'ai_enabled_admin_only';
  END IF;

  RETURN new;
END;
$$;

ALTER FUNCTION "public"."guard_user_prefs_ai_enabled"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trg_user_prefs_guard_ai_enabled"
  BEFORE INSERT OR UPDATE ON "public"."user_prefs"
  FOR EACH ROW EXECUTE FUNCTION "public"."guard_user_prefs_ai_enabled"();


-- ---------------------------------------------------------------------------
-- 3. Writes stay inside households the user belongs to
-- ---------------------------------------------------------------------------

-- expenses: rows are always attributed to the caller, can only target the
-- caller's household, and can only link to the caller's own chat messages.
DROP POLICY IF EXISTS "expenses_insert" ON "public"."expenses";

CREATE POLICY "expenses_insert" ON "public"."expenses"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND (
      "household_id" IS NULL
      OR "public"."is_member_uid"("household_id", (SELECT "auth"."uid"()))
    )
    AND (
      "chat_message_id" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."chat_messages" "m"
        WHERE "m"."id" = "expenses"."chat_message_id"
          AND "m"."user_id" = (SELECT "auth"."uid"())
      )
    )
  );

DROP POLICY IF EXISTS "expenses_update_own" ON "public"."expenses";

CREATE POLICY "expenses_update_own" ON "public"."expenses"
  FOR UPDATE TO "authenticated"
  USING ("user_id" = (SELECT "auth"."uid"()))
  WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND (
      "household_id" IS NULL
      OR "public"."is_member_uid"("household_id", (SELECT "auth"."uid"()))
    )
    AND (
      "chat_message_id" IS NULL
      OR EXISTS (
        SELECT 1
        FROM "public"."chat_messages" "m"
        WHERE "m"."id" = "expenses"."chat_message_id"
          AND "m"."user_id" = (SELECT "auth"."uid"())
      )
    )
  );

-- chat_messages: users write only their own 'user' messages. MoMo replies
-- (author_kind = 'momo', momo_source, idempotency_key) are written by the
-- server with the service role, so users cannot forge or edit them.
DROP POLICY IF EXISTS "chat_messages_insert" ON "public"."chat_messages";

CREATE POLICY "chat_messages_insert" ON "public"."chat_messages"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND (
      "household_id" IS NULL
      OR "public"."is_member_definer_uid"("household_id", (SELECT "auth"."uid"()))
    )
    AND "author_kind" = 'user'
    AND "momo_source" IS NULL
    AND "idempotency_key" IS NULL
  );

DROP POLICY IF EXISTS "chat_messages_update" ON "public"."chat_messages";

CREATE POLICY "chat_messages_update" ON "public"."chat_messages"
  FOR UPDATE TO "authenticated"
  USING (
    "user_id" = (SELECT "auth"."uid"())
    AND "author_kind" = 'user'
  )
  WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND (
      "household_id" IS NULL
      OR "public"."is_member_definer_uid"("household_id", (SELECT "auth"."uid"()))
    )
    AND "author_kind" = 'user'
    AND "momo_source" IS NULL
    AND "idempotency_key" IS NULL
  );

-- category_rules: any household member can update a household rule (this also
-- lets upsert_category_rule overwrite a rule another member created), and the
-- updated row must stay in the caller's own scope.
DROP POLICY IF EXISTS "category_rules_update" ON "public"."category_rules";

CREATE POLICY "category_rules_update" ON "public"."category_rules"
  FOR UPDATE TO "authenticated"
  USING (
    (
      "household_id" IS NULL
      AND "user_id" = (SELECT "auth"."uid"())
    )
    OR (
      "household_id" IS NOT NULL
      AND "public"."is_member_definer_uid"("household_id", (SELECT "auth"."uid"()))
    )
  )
  WITH CHECK (
    "user_id" = (SELECT "auth"."uid"())
    AND (
      "household_id" IS NULL
      OR "public"."is_member_definer_uid"("household_id", (SELECT "auth"."uid"()))
    )
  );


-- ---------------------------------------------------------------------------
-- 4. user_profiles.email mirrors auth.users
-- ---------------------------------------------------------------------------

-- The profile email is shown to household members and is unique, so users must
-- not be able to set it (spoofing, or claiming someone else's email before
-- they sign up). SECURITY DEFINER is needed to read auth.users.
CREATE OR REPLACE FUNCTION "public"."sync_user_profile_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_auth_email text;
BEGIN
  SELECT u.email INTO v_auth_email
  FROM auth.users u
  WHERE u.id = new.user_id;

  IF v_auth_email IS NOT NULL THEN
    new.email := v_auth_email;
  ELSIF tg_op = 'UPDATE' THEN
    new.email := old.email;
  END IF;

  RETURN new;
END;
$$;

ALTER FUNCTION "public"."sync_user_profile_email"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trg_user_profiles_email"
  BEFORE INSERT OR UPDATE ON "public"."user_profiles"
  FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_profile_email"();


-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER lookups only answer about the caller's own household
-- ---------------------------------------------------------------------------

-- Returns a label only for the caller or someone in the caller's household.
-- Used by the per-user stats views, which already only show those users.
CREATE OR REPLACE FUNCTION "public"."get_user_label"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT coalesce(up.display_name, up.email)
  FROM public.user_profiles up
  WHERE up.user_id = p_user_id
    AND (
      p_user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.household_members caller
        JOIN public.household_members target
          ON target.household_id = caller.household_id
        WHERE caller.user_id = (SELECT auth.uid())
          AND target.user_id = p_user_id
      )
    )
$$;

-- Every caller passes auth.uid() as u; refusing any other user stops the
-- function from being used to probe other people's memberships.
CREATE OR REPLACE FUNCTION "public"."is_member_definer_uid"("h" "uuid", "u" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF u IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = h
      AND user_id = u
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- 6. Grants: nothing in public is reachable without signing in
-- ---------------------------------------------------------------------------

-- The app never queries public as anon (invite lookups use the service role).
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon";

-- Functions get EXECUTE for PUBLIC (which includes anon) unless revoked, and
-- the baseline default privileges also granted anon directly, which is why the
-- earlier "REVOKE ... FROM PUBLIC" lines did not lock anon out.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA "public" FROM PUBLIC, "anon";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "public" TO "authenticated", "service_role";

-- Invite lookups stay server-only.
REVOKE EXECUTE ON FUNCTION "public"."get_share_link_info"("p_token" "text") FROM "authenticated";

-- Future objects created by migrations no longer grant anything to anon.
-- New functions still get EXECUTE for PUBLIC from Postgres' global default,
-- so keep revoking it from PUBLIC in each migration that adds one.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";
