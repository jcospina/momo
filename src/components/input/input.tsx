import { cn } from '@utils/cn';
import type { InputHTMLAttributes } from 'react';
import styles from './input.module.css';
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(styles['momo-input'], className)} {...props} />;
}
