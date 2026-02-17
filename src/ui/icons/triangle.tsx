import type { SVGProps } from 'react';

/**
 * Downward-pointing triangle icon — used as the {@link Select} dropdown chevron.
 *
 * @example
 * ```tsx
 * <TriangleIcon width={14} height={10} />
 * ```
 */
export function TriangleIcon({
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" {...props}>
      <polygon
        points="2,2 12,18 22,2"
        fill="black"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
