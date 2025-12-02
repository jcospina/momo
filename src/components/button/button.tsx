import { cn } from '@utils/cn';
import styles from './button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary';
}

export function Button({
  variant,
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: styles['momo-button--primary'],
    secondary: styles['momo-button--secondary'],
  }[variant];

  return (
    <button
      className={cn(
        styles['momo-button'],
        variantClass,
        className,
        'px-2 py-1',
      )}
      {...props}
    >
      {children ?? 'Click me'}
    </button>
  );
}
