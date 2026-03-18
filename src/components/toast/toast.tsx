'use client';
import type { MomoColor, PropsWithClassName } from '@lib-types/common';
import { Flex } from '@ui/flex/flex';
import { CloseIcon } from '@ui/icons/close';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { type CSSProperties, type PropsWithChildren, useState } from 'react';
import styles from './toast.module.css';

type ToastVariant = 'error' | 'info' | 'success';
interface ToastProps {
  variant?: ToastVariant;
}

function getToastBackgroundColor(variant: ToastVariant): MomoColor {
  switch (variant) {
    case 'error':
      return 'vibrant-coral';
    case 'success':
      return 'spring-green';
    case 'info':
    default:
      return 'amber-glow';
  }
}

export function Toast({
  variant = 'info',
  className,
  children,
}: PropsWithChildren<PropsWithClassName<ToastProps>>) {
  const [isVisible, setIsVisible] = useState(true);
  const toastStyles: CSSProperties = {
    backgroundColor: `var(--color-${getToastBackgroundColor(variant)})`,
    display: isVisible ? 'flex' : 'none',
  };

  return (
    <Flex
      as="article"
      alignItems="flex-start"
      justifyContent="space-between"
      paddingX={2}
      paddingY={1}
      gap={2}
      style={toastStyles}
      className={cn(styles['momo-toast'], className)}
    >
      <Flex direction="column">
        {variant === 'error' && (
          <Typography as="h2" weight="bold">
            Error
          </Typography>
        )}
        {children}
      </Flex>
      <button onClick={() => setIsVisible(false)}>
        <CloseIcon />
      </button>
    </Flex>
  );
}
