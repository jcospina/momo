import type { SVGProps } from 'react';

/**
 * X / close icon — used for dismiss, close, and cancel actions.
 *
 * @example
 * ```tsx
 * <CloseIcon width={20} height={20} />
 * ```
 */
export function CloseIcon({
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
