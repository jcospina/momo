# Flex

Source: `src/ui/flex/flex.tsx`, `src/ui/flex/flex.types.ts`

## Use For

- Main layout composition and spacing in most screens/components.

## API Highlights

- Polymorphic: `as?: ElementType` (default `div`)
- `direction`, `justifyContent`, `alignItems`, `wrap`
- `gap`, `gapX`, `gapY`
- `isInline`, `isFullWidth`, `isFullHeight`
- Full padding/margin props from spacing system

## Behavior

- Merges flex styles + spacing + inline style.
- Uses `getGapStyles` and `getSpacingStyles`.

## Guidance

- Start layout with `Flex`, not raw div wrappers.
- Keep spacing via props instead of ad-hoc margin CSS.
- Note current implementation maps `gapX` to `rowGap` and `gapY` to `columnGap`; follow current behavior when adjusting layouts.
