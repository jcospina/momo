# Stats System

## Overview

The stats system renders expense analytics with Visx-based chart components. Data is aggregated in Postgres views, fetched server-side through data facades, and windowed client-side for chart interactions.

## Data Pipeline

```txt
Postgres Views -> Helpers -> Server Actions -> Data Facades (stats/server)
  -> Stats Page (server prefetch)
  -> Client Panels (windowing + charts)
```

## 1. Database Views

Aggregation is done in SQL views (`security_invoker = true`):

| View | What it provides |
| ------ | ------------------ |
| `monthly_by_category` | Total per category per month |
| `monthly_totals` | Grand total per month |
| `monthly_totals_by_user` | Total per user per month (household only) |
| `monthly_by_category_user` | Total per category per user per month (household only) |
| `daily_totals_by_month` | Daily totals + cumulative running total |

Household-scoped logic uses membership checks (`is_member_definer_uid`) and `get_user_label` where needed.

## 2. Server Fetching

`src/app/home/stats/page.tsx` fetches data via `src/lib/data/stats/server.ts`:

- monthly history for personal scope
- monthly history for household scope
- daily comparison for current vs previous month (personal + household when available)

The page sends normalized datasets to client components; no client-side direct database access exists.

## 3. Client Windowing

Client stats panels (`src/components/stats/*`) compute time windows locally from prefetched data.

- Ring charts: `1m`, `3m`, `6m`, `12m`
- Monthly totals bar chart: `3m`, `6m`, `12m`

This avoids extra round-trips when users switch ranges.

## Scope Toggle

Stats use the same personal/household scope toggle pattern as chat.

- If household data is available, the toggle is shown.
- Both scopes are prefetched on initial server render.
- Toggling scope is client-side state switching (no additional fetch).

## Chart Types

### Category Ring Chart

Expense distribution by category for the selected window.

### User Totals Ring Chart

Household-only distribution by member for the selected window.

### Monthly Totals Bar Chart

Stacked monthly totals by category. Uses top 5 categories plus an `Others` bucket.

### Daily Comparison Line Chart

Compares cumulative spending for current month vs previous month using `daily_totals_by_month.cumulative_cents`.
