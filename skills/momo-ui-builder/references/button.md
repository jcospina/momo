# Button

Source: `src/ui/button/button.tsx`, `src/ui/button/button.module.css`

## Use For

- Primary/secondary actions, inline link-style actions, icon-only buttons.

## API

- `variant: 'primary' | 'secondary' | 'link' | 'icon'`
- `asLink?: boolean`
- `className?: string`
- Native button props when `asLink` is false
- Next `LinkProps` + anchor props when `asLink` is true

## Behavior

- `asLink: true` renders Next.js `<Link>` with button styling.
- `disabled` styling applies only in button mode.
- Visual style is neobrutalist (border + shadow + translate on hover).

## Guidance

- Use `variant="icon"` with `aria-label` for icon-only controls.
- Use `variant="link"` for inline textual actions.
