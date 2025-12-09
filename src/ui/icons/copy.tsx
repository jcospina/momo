import type { SVGProps } from 'react';

export function CopyIcon({
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
      strokeLinecap="butt"
      strokeLinejoin="miter"
      {...props}
    >
      <defs>
        <mask id="cutout" maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <rect x="9" y="9" width="12" height="12" fill="black" />
        </mask>
      </defs>
      <rect x="4" y="4" width="14" height="14" mask="url(#cutout)" />
      <rect x="8" y="8" width="14" height="14" />
    </svg>
  );
}
