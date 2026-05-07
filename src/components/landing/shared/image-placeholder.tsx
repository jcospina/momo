import { cn } from '@utils/cn';
import styles from './image-placeholder.module.css';

type ImagePlaceholderProps = {
  variant: 'hero' | 'chart';
  ariaLabel: string;
  className?: string;
};

export function ImagePlaceholder({
  variant,
  ariaLabel,
  className,
}: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        styles['momo-landing-image'],
        styles[`momo-landing-image--${variant}`],
        className,
      )}
    />
  );
}
