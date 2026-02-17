---
name: momo-ui-builder
description: Build and extend UI in MoMo using the existing src/ui design system, CSS modules, and tokenized spacing/color patterns. Use when requests involve implementing or refactoring frontend views/components, choosing the correct src/ui primitives, preserving MoMo visual style, or improving UI accessibility without breaking established component conventions.
---

# MoMo UI Builder

Implement UI by composing existing `src/ui` primitives first, then add feature-specific wrappers in `src/components` or `src/app` only when needed.

## Workflow

1. Map the request to existing primitives before writing new UI code.
2. Load only the component reference files needed for the task.
3. Build structure with layout primitives first (`Flex`, `FlexItem`, `Panel`, spacing wrappers).
4. Add controls (`Input`, `Select`, `ToggleGroup`, `Checkbox`, `Menu`, `Dialog`, `Tooltip`) with accessible props.
5. Match MoMo tokens and motion rules from `references/design-tokens.md`.
6. Verify behavior on both mobile and desktop.

## Reference Loading Guide

Read `references/component-map.md` first, then load only specific files:

- `references/avatar.md`
- `references/button.md`
- `references/checkbox.md`
- `references/circle.md`
- `references/dialog.md`
- `references/divider.md`
- `references/dot-grid.md`
- `references/flex.md`
- `references/flex-item.md`
- `references/icons.md`
- `references/input.md`
- `references/link.md`
- `references/logo.md`
- `references/margin.md`
- `references/menu.md`
- `references/padding.md`
- `references/panel.md`
- `references/select.md`
- `references/toggle-group.md`
- `references/tooltip.md`
- `references/typography.md`
- `references/design-tokens.md`
- `references/composition-patterns.md`

## Guardrails

- Reuse `src/ui/*` before introducing new primitives.
- Keep `src/ui/*` data-agnostic; no fetching or Supabase imports.
- Use CSS modules and existing token variables; avoid hardcoded non-token colors.
- Use `cn()` for class composition.
- Keep semantic HTML with polymorphic `as` props where available.
- Prefer server components by default; use client components only for interactivity.

## Completion Checklist

1. Confirm component props and behavior against the corresponding reference file.
2. Validate keyboard/focus behavior for interactive controls.
3. Keep spacing on the MoMo scale (`calc(var(--spacing) * n)` through component props).
4. Run `pnpm lint` for changed files when feasible.
