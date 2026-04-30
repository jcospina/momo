import { cn } from '@utils/cn';
import styles from './landing.module.css';

type ImagePlaceholderProps = {
  variant: 'hero' | 'chart';
  ariaLabel: string;
};

export function ImagePlaceholder({
  variant,
  ariaLabel,
}: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        styles['momo-landing-image'],
        styles[`momo-landing-image--${variant}`],
      )}
    />
  );
}
