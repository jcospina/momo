'use client';

import { MomoLoader } from '@components/loader/loader';
import { useMediaQuery } from '@hooks/use-media-query';
import { Circle } from '@ui/circle/circle';
import { Logo } from '@ui/logo/logo';
import { Margin } from '@ui/margin/margin';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import styles from './momo-thinking-loader.module.css';

type MomoThinkingLoaderProps = {
  className?: string;
};

const COPY_ROTATION_MS = 2200;

const FALLBACK_COPY = ['…'] as const;

export function MomoThinkingLoader({ className }: MomoThinkingLoaderProps) {
  const tChat = useTranslations('chat');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [index, setIndex] = useState(0);

  const rawCopy = tChat.raw('momo.thinking') as string[] | undefined;
  const copy =
    Array.isArray(rawCopy) && rawCopy.length > 0 ? rawCopy : FALLBACK_COPY;
  const safeIndex = index % copy.length;

  useEffect(() => {
    if (reducedMotion) return;
    if (copy.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex(prev => (prev + 1) % copy.length);
    }, COPY_ROTATION_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [reducedMotion, copy.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={tChat('momo.thinkingAriaLabel')}
      className={cn(styles['momo-thinking-loader'], className)}
    >
      <Margin marginTop={0.5}>
        <Circle size="extra-small" color="mauve-magic">
          <Logo size="sm" className={styles['momo-thinking-loader__logo']} />
        </Circle>
      </Margin>
      <div className={styles['momo-thinking-loader__bubble']}>
        <MomoLoader size="sm" />
        <span className={styles['momo-thinking-loader__copy-slot']}>
          <Typography
            as="span"
            size="md"
            key={safeIndex}
            className={styles['momo-thinking-loader__copy']}
          >
            {copy[safeIndex]}
          </Typography>
        </span>
      </div>
    </div>
  );
}
