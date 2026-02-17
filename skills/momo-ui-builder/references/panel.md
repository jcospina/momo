# Panel

Source: `src/ui/panel/panel.tsx`, `src/ui/panel/panel.types.ts`

## Use For

- Main card/surface containers.

## API Highlights

- Polymorphic: `as?: ElementType`
- `shadowless?: boolean`
- Full padding/margin props
- `className`, `style`, native element props

## Behavior

- Applies panel surface style (light background, dark border, offset shadow).
- `shadowless` removes panel shadow and transform.

## Guidance

- Use for major content blocks (profile/settings/stat cards).
- Combine with `Divider` and internal `Flex` stacks for sections.
