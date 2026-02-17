# Icons

Source: `src/ui/icons/*.tsx`

## Use For

- Consistent iconography across controls/navigation/status.

## Available Icons

- `AlertIcon`
- `CameraIcon`
- `CentsIcon`
- `ChartIcon`
- `CheckIcon`
- `CircleCheckIcon`
- `CloseIcon`
- `FileIcon`
- `GroupIcon`
- `LeftIcon`
- `MessageIcon`
- `PersonIcon`
- `RightIcon`
- `SendIcon`
- `ThreeDotsIcon`
- `TriangleIcon`

## API Pattern

- Components accept `SVGProps<SVGSVGElement>`.
- Most expose default `width` and `height` of `24`; some require explicit size.
- Stroke/fill follows `currentColor` for theme inheritance.

## Guidance

- Set `width`/`height` explicitly inside dense UI (buttons, lists).
- Add `aria-hidden="true"` for decorative icons.
- Use adjacent text or `aria-label` on parent controls for meaning.
