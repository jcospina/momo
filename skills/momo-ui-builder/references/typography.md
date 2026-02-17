# Typography

Source: `src/ui/typography/typography.tsx`, `src/ui/typography/typography.types.ts`

## Use For

- All textual UI in MoMo.

## API

- Polymorphic `as?: ElementType` (default `p`)
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'` (default `md`)
- `weight?: 'light' | 'regular' | 'bold'` (default `regular`)
- `transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'`
- `className` and native element props

## Behavior

- Maps tokens to CSS module classes.
- Keeps semantic element selection independent from visual style tokens.

## Guidance

- Use semantic `as` for structure/accessibility.
- Use size/weight tokens instead of custom font-size/weight declarations.
