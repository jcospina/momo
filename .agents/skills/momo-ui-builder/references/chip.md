# Chip

Source: `src/ui/chip/chip.tsx`, `src/ui/chip/chip.module.css`

## Use For

- One-tap quick choices, such as the suggested categories on a chat ticket.

## API

- `children: ReactNode` (the label, rendered as `Typography` sm bold)
- `dot?: string`: any CSS colour for the leading dot, for example
  `var(--category-dining)`. The chip also warms to it on hover.
- Native button props (`onClick`, `disabled`, `aria-*`, `className`, `style`)
- `type` defaults to `button`, so a chip never submits a form

## Behavior

- Pill shape, thin dark border, small lift and shadow on hover.
- Taller (40px) on phones for touch.
- No dot is rendered when `dot` is omitted.

## Guidance

- Use `ToggleGroup` instead when an option stays selected.
- Pass category or member colours through `categoryColorVar` /
  `memberColorVar` from `src/lib/theme/color-vars.ts`, never raw values.
