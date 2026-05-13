-- Helper: pick the primary tag for an expense given its tags and a {tag: freq} map.
-- Encapsulates the (freq DESC, length DESC, tag ASC) ordering so the main RPC stays readable.
CREATE OR REPLACE FUNCTION "public"."_pick_primary_tag"(
    "p_tags" "text"[],
    "p_freq" "jsonb"
) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT "t"
  FROM "unnest"("p_tags") AS "t"
  ORDER BY ("p_freq"->>"t")::integer DESC NULLS LAST,
           "length"("t") DESC,
           "t" ASC
  LIMIT 1
$$;

ALTER FUNCTION "public"."_pick_primary_tag"(
    "p_tags" "text"[],
    "p_freq" "jsonb"
) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."_pick_primary_tag"(
    "p_tags" "text"[],
    "p_freq" "jsonb"
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."_pick_primary_tag"(
    "p_tags" "text"[],
    "p_freq" "jsonb"
) TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."get_agent_spending_stats"(
    "p_currency" "text",
    "p_scope" "text",
    "p_household_id" "uuid",
    "p_start_date" "date",
    "p_end_date" "date",
    "p_categories" "text"[],
    "p_merchants" "text"[],
    "p_tags" "text"[],
    "p_include_income" boolean,
    "p_group_by" "text",
    "p_limit" integer
) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY INVOKER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
WITH
  -- ── input & scope filter ──
  "normalized" AS (
    SELECT
      "p_currency" AS "currency",
      "p_scope" AS "scope",
      "p_household_id" AS "household_id",
      "p_start_date" AS "start_date",
      "p_end_date" AS "end_date",
      CASE
        WHEN "p_categories" IS NULL OR "cardinality"("p_categories") = 0 THEN NULL::"text"[]
        ELSE ARRAY(SELECT "lower"("item") FROM "unnest"("p_categories") AS "item")
      END AS "categories",
      CASE
        WHEN "p_merchants" IS NULL OR "cardinality"("p_merchants") = 0 THEN NULL::"text"[]
        ELSE ARRAY(SELECT "lower"("item") FROM "unnest"("p_merchants") AS "item")
      END AS "merchants",
      CASE
        WHEN "p_tags" IS NULL OR "cardinality"("p_tags") = 0 THEN NULL::"text"[]
        ELSE ARRAY(SELECT "lower"("item") FROM "unnest"("p_tags") AS "item")
      END AS "tags",
      COALESCE("p_include_income", false) AS "include_income",
      "p_group_by" AS "group_by",
      "p_limit" AS "limit",
      10 AS "tag_topk"
  ),
  "filtered" AS (
    SELECT "e".*
    FROM "public"."expenses" AS "e"
    CROSS JOIN "normalized" AS "n"
    WHERE (
      (
        "n"."scope" = 'personal'
        AND "e"."user_id" = "auth"."uid"()
      )
      OR (
        "n"."scope" = 'household'
        AND "n"."household_id" IS NOT NULL
        AND "e"."household_id" = "n"."household_id"
      )
    )
    AND ("n"."start_date" IS NULL OR "e"."expense_date" >= "n"."start_date")
    AND ("n"."end_date" IS NULL OR "e"."expense_date" <= "n"."end_date")
    AND ("n"."include_income" OR "lower"(COALESCE("e"."category", '')) <> 'income')
    AND (
      "n"."categories" IS NULL
      OR "lower"(COALESCE("e"."category", '')) = ANY("n"."categories")
    )
    AND (
      "n"."merchants" IS NULL
      OR "lower"(COALESCE("e"."merchant", '')) = ANY("n"."merchants")
    )
    AND ("n"."tags" IS NULL OR "e"."tags" && "n"."tags")
  ),
  "totals" AS (
    SELECT
      COALESCE(
        "sum"("amount_cents") FILTER (
          WHERE "lower"(COALESCE("category", '')) <> 'income'
        ),
        0
      ) AS "total_expense_cents",
      COALESCE(
        "sum"("amount_cents") FILTER (
          WHERE "lower"(COALESCE("category", '')) = 'income'
        ),
        0
      ) AS "raw_income_cents",
      "count"(*) AS "transaction_count"
    FROM "filtered"
  ),
  -- ── primary-tag dedup ──
  "tag_freq" AS (
    SELECT "t" AS "tag", "count"(DISTINCT "f"."id") AS "freq"
    FROM "filtered" AS "f"
    CROSS JOIN LATERAL "unnest"("f"."tags") AS "t"
    WHERE "lower"(COALESCE("f"."category", '')) <> 'income'
       OR (SELECT "include_income" FROM "normalized")
    GROUP BY "t"
  ),
  "tag_freq_map" AS (
    SELECT COALESCE("jsonb_object_agg"("tag", "freq"), '{}'::"jsonb") AS "freq_map"
    FROM "tag_freq"
  ),
  "expense_primary" AS (
    SELECT
      "f"."id",
      "f"."amount_cents",
      "f"."category",
      "f"."expense_date",
      "f"."merchant",
      "f"."user_id",
      "public"."_pick_primary_tag"(
        "f"."tags",
        (SELECT "freq_map" FROM "tag_freq_map")
      ) AS "primary_tag"
    FROM "filtered" AS "f"
    WHERE "cardinality"("f"."tags") > 0
      AND (
        "lower"(COALESCE("f"."category", '')) <> 'income'
        OR (SELECT "include_income" FROM "normalized")
      )
  ),
  -- ── group breakdown ──
  "group_rows" AS (
    SELECT
      "labels"."label",
      "labels"."sort_index",
      "f"."id",
      "f"."amount_cents"
    FROM "filtered" AS "f"
    CROSS JOIN "normalized" AS "n"
    CROSS JOIN LATERAL (
      SELECT
        "to_char"("f"."expense_date"::timestamp with time zone, 'YYYY-MM') AS "label",
        NULL::integer AS "sort_index"
      WHERE "n"."group_by" = 'month'

      UNION ALL

      SELECT
        "f"."expense_date"::"text" AS "label",
        NULL::integer AS "sort_index"
      WHERE "n"."group_by" = 'day'

      UNION ALL

      SELECT
        COALESCE("f"."category", 'uncategorized') AS "label",
        NULL::integer AS "sort_index"
      WHERE "n"."group_by" = 'category'

      UNION ALL

      SELECT
        COALESCE("f"."merchant", 'Unknown merchant') AS "label",
        NULL::integer AS "sort_index"
      WHERE "n"."group_by" = 'merchant'

      UNION ALL

      SELECT
        CASE
          WHEN "f"."user_id" = "auth"."uid"() THEN 'Current user'
          ELSE 'Household member'
        END AS "label",
        NULL::integer AS "sort_index"
      WHERE "n"."group_by" = 'user'

      UNION ALL

      SELECT
        CASE EXTRACT(isodow FROM "f"."expense_date")::integer
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
          ELSE 'Sunday'
        END AS "label",
        EXTRACT(isodow FROM "f"."expense_date")::integer AS "sort_index"
      WHERE "n"."group_by" = 'dayOfWeek'
    ) AS "labels"
    WHERE "n"."group_by" IS NOT NULL
  ),
  "group_totals" AS (
    SELECT
      "label",
      "sort_index",
      "sum"("amount_cents") AS "amount_cents",
      "count"(*) AS "transaction_count"
    FROM "group_rows"
    GROUP BY "label", "sort_index"
  ),
  "ranked_groups" AS (
    SELECT
      "gt".*,
      "row_number"() OVER (
        ORDER BY
          CASE
            WHEN "n"."group_by" IN ('month', 'day') THEN "gt"."label"
            ELSE NULL
          END ASC,
          CASE
            WHEN "n"."group_by" = 'dayOfWeek' THEN "gt"."sort_index"
            ELSE NULL
          END ASC,
          CASE
            WHEN "n"."group_by" NOT IN ('month', 'day', 'dayOfWeek') THEN "gt"."amount_cents"
            ELSE NULL
          END DESC,
          "gt"."label" ASC
      ) AS "rank"
    FROM "group_totals" AS "gt"
    CROSS JOIN "normalized" AS "n"
  ),
  -- ── tag sidecar + final assembly ──
  "group_label_rows" AS (
    -- For each group label, map back to its expense rows so per-group tag sidecar can be computed.
    SELECT
      "gr"."label",
      "ep"."id",
      "ep"."amount_cents",
      "ep"."primary_tag"
    FROM "group_rows" AS "gr"
    JOIN "expense_primary" AS "ep" ON "ep"."id" = "gr"."id"
    WHERE "ep"."primary_tag" IS NOT NULL
  ),
  "per_group_tag_totals" AS (
    SELECT
      "label",
      "primary_tag" AS "tag",
      "count"(*) AS "count",
      "sum"("amount_cents") AS "amount_cents",
      "row_number"() OVER (
        PARTITION BY "label"
        ORDER BY "sum"("amount_cents") DESC, "primary_tag" ASC
      ) AS "rank"
    FROM "group_label_rows"
    GROUP BY "label", "primary_tag"
  ),
  "per_group_tags_json" AS (
    SELECT
      "label",
      COALESCE(
        "jsonb_agg"(
          "jsonb_build_object"(
            'tag', "tag",
            'count', "count",
            'amountCents', "amount_cents"
          )
          ORDER BY "rank"
        ) FILTER (WHERE "rank" <= (SELECT "tag_topk" FROM "normalized")),
        '[]'::"jsonb"
      ) AS "tags"
    FROM "per_group_tag_totals"
    GROUP BY "label"
  ),
  "global_tag_totals" AS (
    SELECT
      "primary_tag" AS "tag",
      "count"(*) AS "count",
      "sum"("amount_cents") AS "amount_cents",
      "row_number"() OVER (
        ORDER BY "sum"("amount_cents") DESC, "primary_tag" ASC
      ) AS "rank"
    FROM "expense_primary"
    WHERE "primary_tag" IS NOT NULL
    GROUP BY "primary_tag"
  ),
  "global_tags_json" AS (
    SELECT
      COALESCE(
        "jsonb_agg"(
          "jsonb_build_object"(
            'tag', "tag",
            'count', "count",
            'amountCents', "amount_cents"
          )
          ORDER BY "rank"
        ) FILTER (WHERE "rank" <= (SELECT "tag_topk" FROM "normalized")),
        '[]'::"jsonb"
      ) AS "tags"
    FROM "global_tag_totals"
  ),
  "groups_json" AS (
    SELECT
      CASE
        WHEN "n"."group_by" IS NULL THEN NULL::"jsonb"
        ELSE COALESCE(
          (
            SELECT "jsonb_agg"(
              "jsonb_build_object"(
                'label', "rg"."label",
                'amountCents', "rg"."amount_cents",
                'transactionCount', "rg"."transaction_count",
                'percentageOfTotal',
                  CASE
                    WHEN "t"."total_expense_cents" = 0 THEN NULL
                    ELSE "round"(
                      ("rg"."amount_cents"::numeric / "t"."total_expense_cents"::numeric) * 100,
                      2
                    )
                  END,
                'tags', COALESCE("pgt"."tags", '[]'::"jsonb")
              )
              ORDER BY "rg"."rank"
            )
            FROM "ranked_groups" AS "rg"
            LEFT JOIN "per_group_tags_json" AS "pgt" ON "pgt"."label" = "rg"."label"
            WHERE "n"."limit" IS NULL OR "rg"."rank" <= "n"."limit"
          ),
          '[]'::"jsonb"
        )
      END AS "groups"
    FROM "normalized" AS "n"
    CROSS JOIN "totals" AS "t"
  )
  SELECT "jsonb_build_object"(
    'currency', "n"."currency",
    'scope', "n"."scope",
    'startDate', "n"."start_date"::"text",
    'endDate', "n"."end_date"::"text",
    'totalExpenseCents', "t"."total_expense_cents",
    'totalIncomeCents',
      CASE WHEN "n"."include_income" THEN "t"."raw_income_cents" ELSE 0 END,
    'netCents',
      CASE
        WHEN "n"."include_income" THEN "t"."raw_income_cents" - "t"."total_expense_cents"
        ELSE 0
      END,
    'savingsRate',
      CASE
        WHEN "n"."include_income" AND "t"."raw_income_cents" <> 0 THEN
          "round"(
            (("t"."raw_income_cents" - "t"."total_expense_cents")::numeric / "t"."raw_income_cents"::numeric),
            4
          )
        ELSE NULL
      END,
    'savingsRateBasis',
      CASE
        WHEN "n"."include_income" AND "t"."raw_income_cents" <> 0 THEN 'income'
        ELSE 'unavailable_zero_income'
      END,
    'transactionCount', "t"."transaction_count",
    'groupBy', "n"."group_by",
    'groups', "g"."groups",
    'tags', "gtj"."tags"
  )
FROM "normalized" AS "n"
CROSS JOIN "totals" AS "t"
CROSS JOIN "groups_json" AS "g"
CROSS JOIN "global_tags_json" AS "gtj";
$$;

ALTER FUNCTION "public"."get_agent_spending_stats"(
    "p_currency" "text",
    "p_scope" "text",
    "p_household_id" "uuid",
    "p_start_date" "date",
    "p_end_date" "date",
    "p_categories" "text"[],
    "p_merchants" "text"[],
    "p_tags" "text"[],
    "p_include_income" boolean,
    "p_group_by" "text",
    "p_limit" integer
) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_agent_spending_stats"(
    "p_currency" "text",
    "p_scope" "text",
    "p_household_id" "uuid",
    "p_start_date" "date",
    "p_end_date" "date",
    "p_categories" "text"[],
    "p_merchants" "text"[],
    "p_tags" "text"[],
    "p_include_income" boolean,
    "p_group_by" "text",
    "p_limit" integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_agent_spending_stats"(
    "p_currency" "text",
    "p_scope" "text",
    "p_household_id" "uuid",
    "p_start_date" "date",
    "p_end_date" "date",
    "p_categories" "text"[],
    "p_merchants" "text"[],
    "p_tags" "text"[],
    "p_include_income" boolean,
    "p_group_by" "text",
    "p_limit" integer
) TO "authenticated";
