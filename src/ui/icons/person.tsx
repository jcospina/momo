import type { SVGProps } from 'react';

/**
 * Single person icon — used for personal scope indicators and user profiles.
 *
 * @example
 * ```tsx
 * <PersonIcon width={20} height={20} />
 * ```
 */
export function PersonIcon({
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
