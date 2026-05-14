'use client';

import { MomoLoader } from '@components/loader/loader';
import { useMediaQuery } from '@hooks/use-media-query';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { useEffect, useState } from 'react';
import styles from './momo-thinking-loader.module.css';

type MomoThinkingLoaderProps = {
  className?: string;
};

const COPY_ROTATION_MS = 2200;

const THINKING_COPY = [
  'Crunching numbers…',
  'Counting your coffees…',
  'Doing the math…',
  'Hmm, let me see…',
  'Tallying receipts…',
] as const;

export function MomoThinkingLoader({ className }: MomoThinkingLoaderProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setIndex(prev => (prev + 1) % THINKING_COPY.length);
    }, COPY_ROTATION_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [reducedMotion]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="MoMo is thinking"
      className={cn(styles['momo-thinking-loader'], className)}
    >
      <MomoLoader size="sm" />
      <span className={styles['momo-thinking-loader__copy-slot']}>
        <Typography
          as="span"
          size="md"
          key={index}
          className={styles['momo-thinking-loader__copy']}
        >
          {THINKING_COPY[index]}
        </Typography>
      </span>
    </div>
  );
}
