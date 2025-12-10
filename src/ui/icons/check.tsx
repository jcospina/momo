import type { SVGProps } from 'react';

export function CheckIcon({
  width,
  height,
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
      strokeWidth="4"
      {...props}
    >
      <path d="M20 6 10 16l-5-5" />
    </svg>
  );
}
