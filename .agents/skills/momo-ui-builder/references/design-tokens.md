# Design Tokens

Source: `src/app/globals.css`, `src/lib/types/common.ts`, `src/lib/utils/spacing.ts`.

## Colors

Use token variables only:

- `--color-sunbeam-yellow`
- `--color-spring-green`
- `--color-mauve-magic`
- `--color-amber-glow`
- `--color-vibrant-coral`
- `--color-sky-aqua`
- `--color-light`
- `--color-dark`
- `--color-disabled`

`MomoColor` union for component color props:

- `sunbeam-yellow`, `spring-green`, `mauve-magic`, `amber-glow`,
  `vibrant-coral`, `sky-aqua`

## Spacing

- Base token: `--spacing` (derived from `--spacing-base`, currently `8px`)
- Scale is numeric via helpers:
  - `padding={n}`, `margin={n}`
  - axis/side variants (`paddingX`, `marginBottom`, etc.)
  - values compile to `calc(var(--spacing) * n)`
- `margin*` accepts `'auto'` in wrappers/components that use `MarginProps`

## Typography

- Global font family: `--font-sans`
- Logo font: `--font-logo`
- Base font size token: `--font-size`

## Borders and Radius

- Global radius token: `--border-radius`
- Neobrutalist look uses dark border + offset box shadow. Reuse existing classes.

## Motion

- Most controls use short translate/shadow transitions.
- Keep `prefers-reduced-motion` behavior when adding animations.
