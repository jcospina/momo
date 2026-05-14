# Toggle Group

Source: `src/ui/toggle-group/toggle-group.tsx`, `src/ui/toggle-group/toggle-group.types.ts`

## Use For

- Short segmented controls (time ranges, filter chips, scope toggles).

## API Highlights

- `items: { label, value, onClick?, disabled? }[]`
- `value?: string[]` (controlled)
- `defaultValue?: string[]` (uncontrolled)
- `onValueChange?: (value: string[]) => void`
- `multiple?: boolean` (default `false`)
- `disabled?: boolean`
- `className?: string`

## Behavior

- Built on Base UI `ToggleGroup` + `Toggle`.
- Always reports selection as string array.
- Group-level `disabled` disables all items; each item can also be disabled.

## Guidance

- For single-select behavior, still pass/handle array with one value.
- Keep labels concise and consistent in width when possible.
