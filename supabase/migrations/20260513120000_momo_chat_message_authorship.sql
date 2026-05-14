-- Phase 4 of the @momo agent rollout: add authorship + idempotency metadata
-- to chat_messages. Additive only.
--
-- Reversal (run manually if needed; project convention has no .down.sql):
--   DROP INDEX IF EXISTS public.idx_chat_messages_idempotency_key;
--   ALTER TABLE public.chat_messages
--     DROP COLUMN IF EXISTS momo_invocation_tagged,
--     DROP COLUMN IF EXISTS idempotency_key,
--     DROP COLUMN IF EXISTS momo_source,
--     DROP COLUMN IF EXISTS author_kind;
--   DROP TYPE IF EXISTS public.message_author_kind;

CREATE TYPE "public"."message_author_kind" AS ENUM ('user', 'momo');

ALTER TYPE "public"."message_author_kind" OWNER TO "postgres";

ALTER TABLE "public"."chat_messages"
  ADD COLUMN "author_kind" "public"."message_author_kind"
    NOT NULL DEFAULT 'user',
  ADD COLUMN "momo_source" "text",
  ADD COLUMN "idempotency_key" "text",
  ADD COLUMN "momo_invocation_tagged" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "idx_chat_messages_idempotency_key"
  ON "public"."chat_messages" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
