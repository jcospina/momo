# Checkbox

Source: `src/ui/checkbox/checkbox.tsx`, `.docs/checkbox-component-tutorial.md`

## Use For

- Settings toggles and boolean filters.

## API

- Native checkbox props (except `type` and `size`)
- `error?: boolean`
- `indeterminate?: boolean`
- `size?: 'sm' | 'md'`
- `onCheckedChange?: (checked: boolean | 'indeterminate') => void`
- `inputClassName?: string`

## Behavior

- Native input kept for semantics and form compatibility.
- `indeterminate` is synced to native input ref in an effect.
- Supports external labels via `id` + `<label htmlFor>`.

## Guidance

- Prefer `onCheckedChange` for app logic.
- Pass `aria-describedby` to connect helper/error text.
- Use `error` to set invalid state.
