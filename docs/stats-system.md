---
version: 1.0
last_updated: 2026-05-08
---

# Stats System

## Overview

The stats system renders expense analytics and personal cashflow with Visx-based chart components. Data is aggregated by Postgres views or server-side rollups, fetched through `src/lib/data/stats/server.ts`, and windowed client-side for chart interactions.

## Data Pipeline

```txt
Postgres Views / Rollup Helpers
  -> Stats Server Actions
  -> Data Facades (src/lib/data/stats/{server,client}.ts)
  -> Stats Page (server prefetch)
  -> Client Panels (windowing + charts)
```

No stats UI imports Supabase, server actions, or raw API routes directly.

## Database Views

Aggregation is done in SQL views (`security_invoker = true`) for the shared database-backed paths:

| View | What it provides |
| ------ | ------------------ |
| `monthly_by_category` | Monthly expense totals by category, excluding `income` |
| `monthly_totals` | Monthly expense totals, excluding `income` |
| `monthly_totals_by_user` | Household monthly expense totals by member, excluding `income` |
| `monthly_by_category_user` | Household monthly expense totals by category and member, excluding `income` |
| `daily_totals_by_month` | Daily expense totals plus cumulative monthly spending, excluding `income` |
| `monthly_cashflow_income` | Monthly totals for entries categorized as `income` |
| `monthly_cashflow_expense` | Monthly totals for non-income expense entries |
| `monthly_cashflow_net` | Monthly income, expense, and net totals |

Household-scoped views use membership checks (`is_member_definer_uid`) and `get_user_label` where member labels are needed.

## Personal Rollups

Personal stats are computed through helper rollups under `src/lib/helpers/expenses-stats/` so the same action/facade contract can serve both personal and household scopes.

- Monthly category/user rows come from personal rollup helpers for `scope: 'personal'`.
- Daily comparison rows come from personal rollup helpers for `scope: 'personal'`.
- Cashflow reads use `monthly_cashflow_net` for household scope and a personal rollup equivalent for personal scope.

## Server Fetching

`src/app/home/stats/page.tsx` fetches stats via `src/lib/data/stats/server.ts`:

- monthly category history for personal scope
- monthly category history for household scope
- daily comparison for current vs previous month in personal scope
- daily comparison for current vs previous month in household scope when available
- monthly income vs expense and cumulative savings for personal scope

The page sends normalized datasets to client components. Household cashflow support exists in the stats action/facade shape, but the current page renders cashflow panels only for the personal stats view.

## Client Windowing

Client stats panels (`src/components/stats/*`) compute time windows locally from prefetched data.

- Ring charts: `1m`, `3m`, `6m`, `12m`
- Monthly totals bar chart: `3m`, `6m`, `12m`
- Cashflow panels: trailing monthly windows over the prefetched personal cashflow series

This avoids extra round-trips when users switch ranges.

## Scope Toggle

Stats use the same personal/household scope model as chat.

- If household data is available, the toggle is shown.
- Personal and household expense datasets are prefetched on initial server render.
- Toggling scope is client-side state switching.
- Personal scope renders cashflow, category, daily comparison, and monthly totals panels.
- Household scope renders category, member totals, daily comparison, and monthly totals panels.

## Chart Types

### Category Ring Chart

Expense distribution by category for the selected window.

### User Totals Ring Chart

Household-only distribution by member for the selected window.

### Monthly Totals Bar Chart

Stacked monthly expense totals by category. Uses top categories plus an `Others` bucket.

### Daily Comparison Line Chart

Compares cumulative spending for current month vs previous month using `daily_totals_by_month.cumulative_cents` or the personal rollup equivalent.

### Monthly Income vs Expense Bar Chart

Compares monthly `income`, non-income expense, and net values for personal cashflow.

### Cumulative Savings Line Chart

Shows a running sum of monthly net cashflow for personal savings.
