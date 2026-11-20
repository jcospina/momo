---
version: 1.0
last_updated: 2026-11-20
---

# ADR-010: Fixed category and member colours

## Context

The chat looked cheap next to the landing, stats and profile pages. A
throwaway design lab compared three rounds of variants. The winner, "Color
Tickets", renders every expense message as a torn ticket dyed in its
category's colour. Picking a missing category floods the colour in.

That design only works if colour means the same thing everywhere, and it
didn't:

- Charts coloured series by **rank** (`paletteColor(index)` over six
  `--chart-*` variables). The same category could be colour 1 one month and
  colour 3 the next.
- There are 22 categories and only six brand colours.
- Every household member was the same mauve in chat avatars and the profile.
  Member charts merged people by first name.
- Nothing stored a member's position in their household.

## Decision

**One fixed colour per category, generated per theme.**

- Categories are grouped into seven families (`CATEGORY_FAMILIES` in
  `src/lib/constants/expenses/categories.ts`): food, home, transport,
  wellbeing, fun, people, money. Each family has a base colour per theme
  (`categoryFamilies` in `themes.config.ts`); each category is a distinct
  shade of it.
- Shades and their text colour ("ink") are computed in TypeScript at build
  time from OKLCH values (`src/lib/theme/oklch.ts`,
  `src/lib/theme/category-palette.ts`). `generate-css.ts` writes them as
  plain `oklch(...)` values: `--category-<slug>`, `--category-<slug>-ink`,
  `--category-uncategorized` and `--category-others`.
  - We chose this over CSS relative-colour syntax because it needs no new
    browser features, the CSS is still generated once on the server, and
    tests can check it: every category has a colour, ink contrast is at
    least 4.5:1, and siblings stay visibly different.
- UI code never hard-codes these values. It uses `categoryColorVar` /
  `categoryInkVar` from `src/lib/theme/color-vars.ts`, so a theme switch
  repaints chat and charts in the same frame.
- Unknown slugs (the DB only checks the slug's format) and `uncategorized`
  share one neutral colour. Charts' "Others" bucket has its own.

**One fixed colour per household member, stored as a slot.**

- `household_members.color_slot` (1–5) is assigned by the
  `trg_household_color_slot` trigger: the smallest free slot, with the
  household row locked. Any client-sent value is ignored. Existing rows were
  backfilled owner first.
- We store the slot instead of deriving it from an ordering. A derived order
  would repaint existing members whenever someone joins or leaves.
- `get_household_member_profiles` and the `monthly_by_category_user` view
  now also return `user_id` and `color_slot` (appended columns). Stats key
  members by id, not by first name.
- Themes emit `--member-1..5` (+ ink) and `--member-none`. UI code uses
  `memberColorVar(slot)`.

**Charts colour by identity, not rank.**

- `RingChartItem` gained an optional `color` and `key`.
- The category ring and the monthly bar chart colour series by category.
- The member ring colours members by slot.
- Series charts (income vs expenses, current vs previous month) keep the
  `--chart-*` palette because they encode series, not categories.
- Category names are translated (`expenses.categories.*`, via
  `useCategoryLabel`) wherever they are shown.

## Consequences

- A category or person looks the same in the chat, every chart and the
  profile, in every period and theme.
- Adding a theme means choosing seven family colours (or taking the
  defaults derived from its roles); the tests check its palette.
- Adding a category means placing it in a family. The family test fails
  until it is placed.
- Households created before ADR-009 can have more than five members. Their
  extra slots were backfilled above 5 (the range check is `NOT VALID`), and
  those members show the neutral member colour.
