'use client';

import { useGSAP } from '@gsap/react';
import { Padding } from '@ui/padding/padding';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import { type ReactNode, useEffect, useRef } from 'react';
import styles from './chat-message-bubble.module.css';

type ChatMessageBubbleProps = {
  text: string;
  isOwn: boolean;
  timestamp?: string | null;
  senderName?: string | null;
  avatarSlot?: ReactNode;
  statusSlot?: ReactNode;
  actionsSlot?: ReactNode;
  belowSlot?: ReactNode;
  skipMountAnimation?: boolean;
  className?: string;
};

const MOUNT_DURATION = 0.32;
const STATUS_DURATION = 0.28;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ChatMessageBubble({
  text,
  isOwn,
  timestamp,
  senderName,
  avatarSlot,
  statusSlot,
  actionsSlot,
  belowSlot,
  skipMountAnimation,
  className,
}: ChatMessageBubbleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const statusSlotRef = useRef<HTMLSpanElement>(null);
  const hadStatusRef = useRef<boolean>(Boolean(statusSlot));

  useGSAP(
    () => {
      if (skipMountAnimation || prefersReducedMotion()) return;
      const target = rootRef.current;
      if (!target) return;
      gsap.from(target, {
        scale: 0.85,
        opacity: 0,
        duration: MOUNT_DURATION,
        ease: 'back.out(1.6)',
        transformOrigin: isOwn ? 'right center' : 'left center',
      });
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const hasStatus = Boolean(statusSlot);
    const hadStatus = hadStatusRef.current;
    hadStatusRef.current = hasStatus;
    if (!hasStatus || hadStatus) return;
    if (prefersReducedMotion()) return;
    const node = statusSlotRef.current;
    if (!node) return;
    gsap.fromTo(
      node,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: STATUS_DURATION,
        ease: 'back.out(2)',
        transformOrigin: 'center center',
      },
    );
  }, [statusSlot]);

  return (
    <div
      ref={rootRef}
      className={cn(
        styles['momo-chat-bubble'],
        isOwn && styles['momo-chat-bubble--own'],
        className,
      )}
    >
      {avatarSlot ?? (
        <div className={styles['momo-chat-bubble__avatar-placeholder']} />
      )}
      <div
        className={cn(
          styles['momo-chat-bubble__column'],
          isOwn && styles['momo-chat-bubble__column--own'],
        )}
      >
        <Padding
          as="article"
          paddingX={2}
          paddingY={1}
          className={cn(
            styles['momo-chat-bubble__message'],
            isOwn && styles['momo-chat-bubble__message--own'],
          )}
        >
          {!isOwn && senderName ? (
            <Typography
              as="div"
              size="sm"
              weight="bold"
              className={styles['momo-chat-bubble__sender']}
            >
              {senderName}
            </Typography>
          ) : null}
          <div className={styles['momo-chat-bubble__content-row']}>
            {statusSlot ? (
              <span
                ref={statusSlotRef}
                className={styles['momo-chat-bubble__status-slot']}
              >
                {statusSlot}
              </span>
            ) : null}
            <Typography
              as="p"
              size="md"
              className={styles['momo-chat-bubble__content']}
            >
              {text}
            </Typography>
            {actionsSlot ? (
              <span className={styles['momo-chat-bubble__actions-slot']}>
                {actionsSlot}
              </span>
            ) : null}
          </div>
        </Padding>
        {timestamp ? (
          <Typography
            as="div"
            size="sm"
            className={cn(
              styles['momo-chat-bubble__timestamp'],
              isOwn
                ? styles['momo-chat-bubble__timestamp--own']
                : styles['momo-chat-bubble__timestamp--incoming'],
            )}
          >
            {timestamp}
          </Typography>
        ) : null}
        {belowSlot ?? null}
      </div>
    </div>
  );
}
