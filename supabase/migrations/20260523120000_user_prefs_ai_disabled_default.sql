-- Flip the default for user_prefs.ai_enabled from true to false so that
-- new users do not get AI features enabled implicitly. The flag is an
-- admin-managed toggle with no end-user UI; gating logic checks for an
-- explicit `true`. Existing rows have already been migrated by hand.
--
-- Reversal (manual; project convention has no .down.sql):
--   ALTER TABLE "public"."user_prefs"
--     ALTER COLUMN "ai_enabled" SET DEFAULT true;

ALTER TABLE "public"."user_prefs"
  ALTER COLUMN "ai_enabled" SET DEFAULT false;
