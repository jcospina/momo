# Padding

Source: `src/ui/padding/padding.tsx`

## Use For

- Applying padding spacing on semantic wrapper elements.

## API

- Polymorphic `as?: ElementType`
- `padding`, `paddingX`, `paddingY`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`

## Behavior

- Converts props to inline styles via `getPaddingStyles`.

## Guidance

- Use for one-off padded wrappers inside dialogs/panels.
- Prefer `Flex`/`Panel` spacing props for higher-level layout.
