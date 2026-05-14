# Logo

Source: `src/ui/logo/logo.tsx`

## Use For

- Brand display in headers, auth screens, and loading states.

## API

- `text?: string` (default `MoMo`)
- `className?: string`

## Behavior

- Uses `--font-logo` and responsive `clamp()` sizing in CSS.

## Guidance

- Keep default text unless there is an explicit branding requirement.
- Use wrapper layout components for positioning, not custom inline styles.
