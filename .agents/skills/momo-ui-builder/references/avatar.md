# Avatar

Source: `src/ui/avatar/avatar.tsx`, `src/ui/avatar/avatar.types.ts`

## Use For

- User identity chips in nav, lists, profile headers.

## API

- `displayName: string | null` (required)
- `size?: 'extra-small' | 'small' | 'medium' | 'large'` (default `medium`)
- `color?: MomoColor` (default `sky-aqua`)
- `onClick?: () => void`
- `className?: string`

## Behavior

- Built on `Circle`.
- Renders first uppercase character of `displayName`.
- Falls back to `?` for null/blank names.

## Guidance

- Prefer `Avatar` over raw `Circle` when representing a person.
- Pair with `Typography` for names.
