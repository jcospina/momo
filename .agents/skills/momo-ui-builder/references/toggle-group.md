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
- Each label renders as `Typography` (`md`, bold). To resize one group, set
  `font-size` on its labels from the consumer's CSS (e.g.
  `.my-group span { font-size: var(--type-sm); }`).
- Always reports selection as string array.
- Group-level `disabled` disables all items; each item can also be disabled.
- Moves like `Sticker`: hover peels a toggle up, press squashes it, and the
  pressed one springs into a slight tilt (sky fill).

## Guidance

- For single-select behavior, still pass/handle array with one value.
- Keep labels concise and consistent in width when possible.
