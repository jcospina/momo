# Input

Source: `src/ui/input/input.tsx`

## Use For

- Text entry and chat-like message composition.

## API Highlights

- Native input and textarea props
- `prefix?: ReactNode`, `suffix?: ReactNode`
- `multiline?: boolean`
- `autoResize?: boolean` (default `true`)
- `minRows?: number` (default `1`)
- `maxRows?: number` (default `6`)
- `inputClassName?: string`

## Behavior

- Renders `<input>` or `<textarea>` based on `multiline`.
- Multiline autosize recalculates height from computed line height/padding/border.
- Forwards ref to the native element.

## Guidance

- Use suffix for send/upload actions.
- Use multiline + autosize for chat compose areas.
- Preserve disabled state and accessibility attributes.
