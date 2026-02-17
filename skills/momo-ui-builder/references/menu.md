# Menu

Source: `src/ui/menu/menu.tsx`, `src/ui/menu/menu.types.ts`

## Use For

- Compact action menus attached to buttons/avatars.

## API Highlights

- `children: ReactElement` trigger
- `items?: MenuItemConfig[]` where each item is:
  - `{ type: 'item', label, icon?, onSelect?, disabled?, closeOnSelect?, tone? }`
  - `{ type: 'separator' }`
- `openOnHover?`, `hoverDelay?`, `closeDelay?`
- `side?`, `align?`, `sideOffset?`
- `onOpenChange?`, `className?`

## Behavior

- Built on `@base-ui/react/menu`.
- Trigger is wrapped in span with `nativeButton={false}`.
- Item selection uses `onClick={onSelect}` and `closeOnClick={closeOnSelect}`.
- `tone: 'danger'` applies destructive color treatment.

## Guidance

- Use separators to group related actions.
- Keep destructive actions at the bottom with `danger` tone.
