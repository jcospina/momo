# Composition Patterns

Use these patterns to keep UI consistent with existing MoMo screens.

## Page Shell

1. Top-level stack:
   - `<Flex direction="column" padding={3} gap={5}>`
   - `Navbar` / heading row
   - content panel/area
2. Use `Panel` for major content sections.

## Form Rows

1. Use `Flex` for label + control alignment.
2. Use `Input`, `Select`, `Checkbox`, `ToggleGroup` from `src/ui`.
3. Keep spacing on scale with `gap`, `padding`, and `margin` props.

## Dialog Flow

1. `const controller = useDialogController()`
2. Spread `controller.triggerProps` onto trigger button.
3. Render `<Dialog controller={controller} ... />`.
4. Put primary/secondary actions in `actions`.

## Action Menus

1. Wrap trigger with `<Menu items=[...]>{trigger}</Menu>`.
2. Use `separator` items for grouping.
3. Use `tone: 'danger'` for destructive actions.

## Text System

1. Use `Typography` for all app text.
2. Pick semantic `as` (`h1`, `h2`, `p`, `label`) and visual `size` separately.
3. Avoid raw text nodes with custom inline styles unless truly local.

## Background Decoration

1. Use `DotGrid` only as decorative background layer.
2. Keep it `aria-hidden` and `pointer-events: none`.
