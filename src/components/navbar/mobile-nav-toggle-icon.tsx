import { cn } from '@utils/cn';
import type { SVGProps } from 'react';
import styles from './app-navbar.module.css';

type MobileNavToggleIconProps = SVGProps<SVGSVGElement> & {
  open: boolean;
  reducedMotion?: boolean;
};

export function MobileNavToggleIcon({
  open,
  reducedMotion = false,
  className,
  ...props
}: MobileNavToggleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn(styles['momo-app-navbar__toggle-icon'], className)}
      data-open={open ? '' : undefined}
      data-reduced-motion={reducedMotion ? '' : undefined}
      aria-hidden="true"
      {...props}
    >
      <line
        x1="4"
        y1="5"
        x2="20"
        y2="5"
        className={cn(
          styles['momo-app-navbar__toggle-line'],
          styles['momo-app-navbar__toggle-line--top'],
        )}
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className={cn(
          styles['momo-app-navbar__toggle-line'],
          styles['momo-app-navbar__toggle-line--middle'],
        )}
      />
      <line
        x1="4"
        y1="19"
        x2="20"
        y2="19"
        className={cn(
          styles['momo-app-navbar__toggle-line'],
          styles['momo-app-navbar__toggle-line--bottom'],
        )}
      />
    </svg>
  );
}
