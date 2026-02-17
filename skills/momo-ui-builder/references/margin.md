# Margin

Source: `src/ui/margin/margin.tsx`

## Use For

- Applying margin spacing without creating one-off CSS classes.

## API

- Polymorphic `as?: ElementType`
- `margin`, `marginX`, `marginY`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`
- Accepts numeric spacing or `'auto'` where supported

## Behavior

- Converts props to inline styles via `getMarginStyles`.

## Guidance

- Use for isolated spacing wrappers.
- Prefer `Flex` spacing props for primary layout structure.
