# Circle

Source: `src/ui/circle/circle.tsx`, `src/ui/circle/circle.types.ts`

## Use For

- Circular badges or foundational shape for avatar-like UI.

## API

- `size?: 'extra-small' | 'small' | 'medium' | 'large'` (default `medium`)
- `color?: MomoColor` (default `sky-aqua`)
- `onClick?: () => void`
- `className?: string`
- `style?: CSSProperties`

## Behavior

- Derives size/shadow/font/border via CSS custom properties.
- Auto-scales down one step on mobile (`large -> medium`, `medium -> small`).
- Adds pointer/hover treatment when `onClick` is present.

## Guidance

- Use when content is short (single letter/icon).
- Prefer `Avatar` for person identity.
