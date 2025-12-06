import { cn } from '@utils/cn';
import type { ButtonHTMLAttributes } from 'react';
import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'link';
}

export function Button({
  variant,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: styles['momo-button--primary'],
    secondary: styles['momo-button--secondary'],
    link: styles['momo-button--link'],
  }[variant];

  return (
    <button
      className={cn(
        styles['momo-button'],
        variantClass,
        disabled && styles['momo-button--disabled'],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
