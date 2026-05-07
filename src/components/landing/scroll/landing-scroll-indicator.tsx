'use client';

import { useScrollTick } from '@hooks/use-scroll-progress';
import { useRef } from 'react';
import styles from './landing-scroll-indicator.module.css';

export function LandingScrollIndicator() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);

  useScrollTick(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    if (!track || !fill) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) {
      track.style.opacity = '0';
      return;
    }
    const progress = window.scrollY / max;
    const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    fill.style.height = `${clamped * 100}%`;
    const visible = clamped > 0.005 && clamped < 0.99;
    track.style.opacity = visible ? '1' : '0';
  });

  return (
    <div
      ref={trackRef}
      className={styles['momo-landing-scroll-indicator']}
      aria-hidden="true"
    >
      <div
        ref={fillRef}
        className={styles['momo-landing-scroll-indicator__fill']}
      />
    </div>
  );
}
