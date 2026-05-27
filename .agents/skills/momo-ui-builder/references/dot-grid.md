# Dot Grid

Source: `src/ui/dot-grid/dot-grid.tsx`, `.docs/canvas-dot-grid.md`

## Use For

- Decorative full-screen background layer.

## API

- `gridSize?: number` (default `32`)
- `dotRadius?: number` (default `2`)
- `blastRadius?: number` (default `80`)
- `blastStrength?: number` (default `3`)
- `baseColor?: string` RGB triplet (default `'255,255,255'`)
- `baseOpacity?: number` (default `0.6`)
- `hoverOpacity?: number` (default `0.95`)
- `density?: number` (default `1`)
- `disableHover?: boolean` (default `false`)

## Behavior

- Canvas-based, fixed-position, `pointer-events: none`, `aria-hidden`.
- Respects `devicePixelRatio` and redraws on resize/mouse events.

## Guidance

- Keep it behind content (`z-index` layering already handled in app layout).
- Disable hover on mobile-like devices for performance.
