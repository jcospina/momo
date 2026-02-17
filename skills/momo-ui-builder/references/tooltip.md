# Tooltip

Source: `src/ui/tooltip/tooltip.tsx`, `.docs/tooltip.md`

## Use For

- Supplemental context on hover/focus for icons and compact controls.

## API Highlights

- `as?: intrinsic element` (default `span`)
- `label?: ReactNode`
- `title?: string`
- `isEnabled?: boolean` (default `true`)
- `triggerClassName?`, wrapper `className?`
- trigger native props/events (`onFocus`, `onMouseEnter`, etc.)

## Behavior

- Content resolution: `label -> title -> aria-label`.
- Shows after 500ms delay on hover/focus.
- Hides on blur/mouseleave/Escape.
- Adds `tabIndex=0` automatically when trigger is a span.
- Uses `aria-describedby` only while visible.

## Guidance

- Avoid empty tooltip content; component suppresses bubble when content is absent.
- Keep tooltip text short and actionable.
