# Sticker

Source: `src/ui/sticker/sticker.tsx`, `src/ui/sticker/sticker.module.css`

## Use For

- Navigation words in a bar (the app and landing navbars).
- Short standalone choices or calls to action that should feel tactile.

## API

- `as?: ElementType` (default `button`; use `a` or Next's `Link` for links)
- `active?: boolean`: the selected one (current page). Sky fill, placed with
  a slight tilt. Pair with `aria-current` / `aria-pressed` yourself.
- `variant?: 'paper' | 'primary'` (default `paper`; `primary` is the green
  call to action, e.g. Sign up)
- `shape?: 'tag' | 'pill'` (default `tag`)
- Any props of the rendered element (`href`, `onClick`, `aria-*`,
  `className`). Buttons default to `type="button"`.

## Behavior

- Thin dark border, bold label, paper background.
- Hover (pointer devices only) peels it up: `--tilt-peel` plus a lift and a
  small hard shadow. Press squashes it; the active one lands at
  `--tilt-placed` on the `--ease-spring` curve, so it settles with a bounce.
- Transitions are off under `prefers-reduced-motion`.

## Guidance

- Colour only means "selected" (sky). Don't give each destination its own
  colour: in the chat, colour means category.
- Use `ToggleGroup` for a set of mutually exclusive options; it shares the
  same motion.
- Use `Highlight` for emphasis inside text, not for interactive labels.
