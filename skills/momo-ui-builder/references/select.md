# Select

Source: `src/ui/select/select.tsx`, `src/ui/select/select.types.ts`

## Use For

- Typed single-select controls (currency, language, profile options).

## API Highlights

- Generic `Select<T>`
- Required:
  - `options: T[]`
  - `getOptionLabel(option): string`
  - `getOptionValue(option): string | number`
- Optional:
  - `value`, `defaultValue`, `onChange`
  - `renderOption`, `renderValue`
  - `getOptionDisabled`, `getOptionKey`
  - `placeholder`, `dropdownClassName`, `onOpenChange`
  - native select-like props (`name`, `required`, `aria-*`, etc.)

## Behavior

- Built on `@base-ui/react/select`.
- Controlled and uncontrolled modes supported.
- Hidden input is rendered when `name` is provided for form submits.
- If uncontrolled selected option disappears from `options`, selection resets.

## Guidance

- Always keep `getOptionValue` stable for consistent equality.
- Pass `aria-label` or `aria-labelledby` for accessible trigger naming.
