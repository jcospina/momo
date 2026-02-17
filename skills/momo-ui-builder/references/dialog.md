# Dialog

Source: `src/ui/dialog/dialog.tsx`, `src/ui/dialog/dialog.types.ts`

## Use For

- Confirmations, destructive actions, contextual detail popups.

## API

- `useDialogController(options?)`
- `<Dialog controller title content actions? className? />`

`useDialogController` returns:

- `open`, `onOpenChange`, `openDialog`, `closeDialog`, `toggleDialog`
- `triggerProps` for trigger element
- `dialogProps` consumed internally by `Dialog`

## Behavior

- Built on `@base-ui/react/dialog`.
- Renders portal popup + backdrop + default Close action when no `actions`.

## Guidance

- Spread `triggerProps` onto the element that opens the dialog.
- Keep dialog content concise; place overflow content in body section.
