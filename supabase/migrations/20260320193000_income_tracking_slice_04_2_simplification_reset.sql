CREATE OR REPLACE VIEW "public"."daily_totals_by_month" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("expense_date"::timestamp with time zone, 'YYYY-MM'::"text") AS "month",
    (EXTRACT(day FROM "expense_date"))::integer AS "day",
    "sum"("amount_cents") AS "total_cents",
    "sum"("sum"("amount_cents")) OVER (
        PARTITION BY "household_id", ("to_char"("expense_date"::timestamp with time zone, 'YYYY-MM'::"text"))
        ORDER BY (EXTRACT(day FROM "expense_date"))::integer
    ) AS "cumulative_cents"
FROM "public"."expenses"
WHERE "category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "household_id",
    ("to_char"("expense_date"::timestamp with time zone, 'YYYY-MM'::"text")),
    (EXTRACT(day FROM "expense_date"))::integer;

CREATE OR REPLACE VIEW "public"."monthly_by_category" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "category",
    "sum"("amount_cents") AS "total_cents"
FROM "public"."expenses"
WHERE "category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "household_id",
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text")),
    "category";

CREATE OR REPLACE VIEW "public"."monthly_by_category_user" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    COALESCE("category", 'uncategorized'::"text") AS "category",
    "public"."get_user_label"("user_id") AS "user_label",
    "sum"("amount_cents") AS "total_cents"
FROM "public"."expenses" "e"
WHERE
    (
        (
            "household_id" IS NOT NULL
            AND "public"."is_member_definer_uid"(
                "household_id",
                (
                    SELECT
                        "auth"."uid"() AS "uid"
                )
            )
        )
        OR (
            "household_id" IS NULL
            AND "user_id" = (
                SELECT
                    "auth"."uid"() AS "uid"
            )
        )
    )
    AND "category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "household_id",
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text")),
    COALESCE("category", 'uncategorized'::"text"),
    ("public"."get_user_label"("user_id"));

CREATE OR REPLACE VIEW "public"."monthly_totals" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "sum"("amount_cents") AS "total_cents"
FROM "public"."expenses"
WHERE "category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "household_id",
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text"));

CREATE OR REPLACE VIEW "public"."monthly_totals_by_user" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "public"."get_user_label"("user_id") AS "user_label",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "sum"("amount_cents") AS "total_cents"
FROM "public"."expenses" "e"
WHERE
    "household_id" IS NOT NULL
    AND "public"."is_member_definer_uid"(
        "household_id",
        (
            SELECT
                "auth"."uid"() AS "uid"
        )
    )
    AND "category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "household_id",
    ("public"."get_user_label"("user_id")),
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text"));

CREATE OR REPLACE VIEW "public"."monthly_cashflow_income" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "sum"("amount_cents") AS "total_cents"
FROM "public"."expenses"
WHERE "category" = 'income'::"text"
GROUP BY
    "household_id",
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text"));

CREATE OR REPLACE VIEW "public"."monthly_cashflow_expense" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    "sum"("amount_cents") AS "total_cents"
FROM "public"."expenses"
WHERE "category" IS DISTINCT FROM 'income'::"text"
GROUP BY
    "household_id",
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text"));

CREATE OR REPLACE VIEW "public"."monthly_cashflow_net" WITH ("security_invoker" = 'true') AS
SELECT
    "household_id",
    "to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text") AS "month",
    COALESCE("sum"("amount_cents") FILTER (WHERE "category" = 'income'::"text"), 0::bigint) AS "income_cents",
    COALESCE("sum"("amount_cents") FILTER (WHERE "category" IS DISTINCT FROM 'income'::"text"), 0::bigint) AS "expense_cents",
    COALESCE("sum"(
        CASE
            WHEN "category" = 'income'::"text" THEN "amount_cents"
            ELSE -"amount_cents"
        END
    ), 0::bigint) AS "net_cents"
FROM "public"."expenses"
GROUP BY
    "household_id",
    ("to_char"("date_trunc"('month'::"text", "expense_date"::timestamp with time zone), 'YYYY-MM'::"text"));

DROP INDEX IF EXISTS "public"."idx_expenses_household_entry_type_expense_date";
DROP INDEX IF EXISTS "public"."idx_expenses_personal_user_entry_type_expense_date";

CREATE INDEX "idx_expenses_household_category_expense_date"
ON "public"."expenses" USING "btree" ("household_id", "category", "expense_date")
WHERE "household_id" IS NOT NULL;

CREATE INDEX "idx_expenses_personal_user_category_expense_date"
ON "public"."expenses" USING "btree" ("user_id", "category", "expense_date")
WHERE "household_id" IS NULL;

ALTER TABLE "public"."chat_messages"
DROP COLUMN IF EXISTS "has_uncertain_type";

ALTER TABLE "public"."expenses"
DROP COLUMN IF EXISTS "entry_type";
