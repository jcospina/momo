# Flex Item

Source: `src/ui/flex-item/flex-item.tsx`, `src/ui/flex-item/flex-item.types.ts`

## Use For

- Child-level control inside a `Flex` container.

## API Highlights

- Polymorphic: `as?: ElementType`
- `grow?: number` (default `0`)
- `shrink?: number` (default `1`)
- `basis?: string` (default `auto`)
- `order?: number` (default `0`)
- `align?: align-self value`
- Full padding/margin props

## Guidance

- Use `grow={1}` for fill behavior in split layouts.
- Use `shrink={0}` for fixed-width side content.
- Keep control local here instead of overriding parent flex classes.
