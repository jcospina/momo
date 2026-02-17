import type { SVGProps } from 'react';

/**
 * Right-pointing chevron icon — used for forward navigation and disclosure.
 *
 * @example
 * ```tsx
 * <RightIcon width={20} height={20} />
 * ```
 */
export function RightIcon({
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
