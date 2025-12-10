import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';

import styles from './logo.module.css';

interface LogoProps {
  text?: string;
}
export function Logo({
  className,
  text = 'MoMo',
}: PropsWithClassName<LogoProps>) {
  return <div className={cn(styles['momo-logo'], className)}>{text}</div>;
}
