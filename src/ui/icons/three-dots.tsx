/**
 * Vertical ellipsis (three dots) icon — used for "more options" menus.
 *
 * @example
 * ```tsx
 * <ThreeDotsIcon width={20} height={20} />
 * ```
 */
export function ThreeDotsIcon({
  width,
  height,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}
