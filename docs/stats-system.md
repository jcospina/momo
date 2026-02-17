# Stats System

## Overview

The stats system provides visual expense analytics using ECharts. Data flows from database views through server-side shaping to client-side time filtering.

## Data Pipeline

```txt
DB Views → Server Actions (shaping) → Client (time filtering) → ECharts
```

### 1. Database Views

Aggregation happens in Postgres views (all with `security_invoker = true`):

| View | What it provides |
| ------ | ------------------ |
| `monthly_by_category` | Total per category per month |
| `monthly_totals` | Grand total per month |
| `monthly_totals_by_user` | Total per user per month (household only) |
| `monthly_by_category_user` | Total per category per user per month (household only) |
| `daily_totals_by_month` | Daily totals + cumulative running total |

Household-scoped views use `is_member_definer_uid` for membership verification and `get_user_label` for display names.

### 2. Server-Side Shaping

Server actions in `src/lib/helpers/expenses/expense-stats.ts` fetch from these views and shape the data into chart-ready structures. The server fetches the full dataset for the user's scope.

### 3. Client-Side Time Filtering

The client receives the full dataset and filters by time window:

| Window | Months shown |
| -------- | ------------- |
| 1m | Current month only |
| 3m | Last 3 months |
| 6m | Last 6 months |
| 12m | Last 12 months |

This approach avoids re-fetching when the user switches time windows.

## Chart Types

### Ring Charts

- **By category** — Shows expense distribution across categories for the selected period. Available in both personal and household scopes.
- **By member** — Shows expense distribution across household members. Household scope only.

### Bar Chart

Monthly totals stacked by category. Shows the top 5 categories plus an "Others" bucket for the rest. Useful for spotting spending trends over time.

### Daily Comparison Line Chart

Plots cumulative daily spending for the current month vs the previous month. Uses a custom tooltip. Data comes from the `daily_totals_by_month` view with its `cumulative_cents` window function.

## Scope Toggle

Stats support the same personal/household scope toggle as chat. Switching scope re-runs the server action to fetch data for the selected scope.
