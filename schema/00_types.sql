-- 00_types.sql
-- Enum types used across the schema.

create type public.chat_message_status as enum ('pending','processed','needs_category','failed', 'no_expense');

create type public.currency_type as enum ('EUR', 'COP', 'USD');

create type public.language as enum ('en', 'es');
