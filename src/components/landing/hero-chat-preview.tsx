'use client';

import { Avatar } from '@ui/avatar/avatar';
import { Flex } from '@ui/flex/flex';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { GroupIcon } from '@ui/icons/group';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { Padding } from '@ui/padding/padding';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import styles from './hero-chat-preview.module.css';

type ChatPreviewMessage = {
  id: string;
  sender: string;
  initial: string;
  avatarColor: 'mauve-magic' | 'sky-aqua' | 'amber-glow';
  text: string;
  isOwn: boolean;
  time: string;
};

const MESSAGES: ChatPreviewMessage[] = [
  {
    id: 'food',
    sender: 'Alex',
    initial: 'A',
    avatarColor: 'sky-aqua',
    text: '15.50 lunch chipotle',
    isOwn: true,
    time: '12:31 PM',
  },
  {
    id: 'cafe',
    sender: 'Sam',
    initial: 'S',
    avatarColor: 'mauve-magic',
    text: '4 coffee',
    isOwn: false,
    time: '12:34 PM',
  },
  {
    id: 'transit',
    sender: 'Alex',
    initial: 'A',
    avatarColor: 'sky-aqua',
    text: '22 uber to airport',
    isOwn: true,
    time: '12:48 PM',
  },
  {
    id: 'groceries',
    sender: 'Sam',
    initial: 'S',
    avatarColor: 'mauve-magic',
    text: '54 groceries trader joes',
    isOwn: false,
    time: '5:12 PM',
  },
  {
    id: 'health',
    sender: 'Alex',
    initial: 'A',
    avatarColor: 'sky-aqua',
    text: '18 pharmacy',
    isOwn: true,
    time: '6:20 PM',
  },
];

const SUB_STEPS = 2; // 0: appeared, 1: processed
const STEP_MS = 900;
const WINDOW = 5; // how many appearances to keep mounted at once
const TICK_MODULO = MESSAGES.length * SUB_STEPS * 1000;

type ChatPreviewProps = {
  ariaLabel: string;
  className?: string;
};

export function HeroChatPreview({ ariaLabel, className }: ChatPreviewProps) {
  const t = useTranslations('landing.hero.chatPreview');
  const [step, setStep] = useState(0);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (media?.matches) {
      setStep(SUB_STEPS * 3 - 1); // show first 3 already processed, static
      return;
    }

    const id = window.setInterval(() => {
      setStep(prev => (prev + 1) % TICK_MODULO);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  const totalAppearances = Math.floor(step / SUB_STEPS) + 1;
  const subInLatest = step % SUB_STEPS;
  const startIdx = Math.max(0, totalAppearances - WINDOW);
  const items: Array<{
    appearanceId: number;
    msg: ChatPreviewMessage;
    processed: boolean;
  }> = [];
  for (let i = startIdx; i < totalAppearances; i++) {
    const isLatest = i === totalAppearances - 1;
    items.push({
      appearanceId: i,
      msg: MESSAGES[i % MESSAGES.length],
      processed: !isLatest || subInLatest >= 1,
    });
  }

  useEffect(() => {
    if (totalAppearances === 0) return;
    const thread = threadRef.current;
    if (!thread) return;

    let rafId = 0;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      thread.scrollTop = thread.scrollHeight;
      if (now - startTime < STEP_MS) {
        rafId = window.requestAnimationFrame(tick);
      }
    };
    rafId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafId);
  }, [totalAppearances]);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(styles['momo-hero-chat'], className)}
    >
      <div className={styles['momo-hero-chat__header']} aria-hidden="true">
        <GroupIcon width={20} height={20} />
        <span className={styles['momo-hero-chat__title']}>
          {t('headerTitle')}
        </span>
      </div>
      <div
        ref={threadRef}
        className={styles['momo-hero-chat__thread']}
        aria-hidden="true"
      >
        {items.map(item => (
          <div
            key={item.appearanceId}
            className={styles['momo-hero-chat__slot']}
          >
            <ChatPreviewBubble message={item.msg} processed={item.processed} />
          </div>
        ))}
      </div>
    </div>
  );
}

type BubbleProps = {
  message: ChatPreviewMessage;
  processed: boolean;
};

function ChatPreviewBubble({ message, processed }: BubbleProps) {
  return (
    <Flex
      gap={1}
      marginLeft={message.isOwn ? 'auto' : 0}
      alignItems="flex-start"
      className={cn(
        styles['momo-hero-chat__row'],
        message.isOwn && styles['momo-hero-chat__row--own'],
      )}
    >
      {!message.isOwn ? (
        <div className={styles['momo-hero-chat__avatar']}>
          <Avatar
            size="extra-small"
            displayName={message.initial}
            color={message.avatarColor}
          />
        </div>
      ) : null}
      <Flex
        direction="column"
        gap={0.5}
        className={styles['momo-hero-chat__bubble']}
        style={{ alignItems: message.isOwn ? 'flex-end' : 'flex-start' }}
      >
        <Padding
          paddingX={2}
          paddingY={1}
          className={cn(
            styles['momo-hero-chat__message'],
            message.isOwn && styles['momo-hero-chat__message--own'],
          )}
        >
          {!message.isOwn ? (
            <Typography
              as="div"
              size="sm"
              weight="bold"
              className={styles['momo-hero-chat__sender']}
            >
              {message.sender}
            </Typography>
          ) : null}
          <div className={styles['momo-hero-chat__content-row']}>
            <span
              className={cn(
                styles['momo-hero-chat__status'],
                processed && styles['momo-hero-chat__status--visible'],
              )}
              aria-hidden="true"
            >
              <CircleCheckIcon width={18} height={18} />
            </span>
            <Typography
              as="p"
              size="md"
              className={styles['momo-hero-chat__content']}
            >
              {message.text}
            </Typography>
            {message.isOwn ? (
              <span
                className={styles['momo-hero-chat__actions']}
                aria-hidden="true"
              >
                <ThreeDotsIcon width={16} height={16} />
              </span>
            ) : null}
          </div>
        </Padding>
        <Typography
          as="div"
          size="sm"
          className={cn(
            styles['momo-hero-chat__timestamp'],
            message.isOwn
              ? styles['momo-hero-chat__timestamp--own']
              : styles['momo-hero-chat__timestamp--incoming'],
          )}
        >
          {message.time}
        </Typography>
      </Flex>
    </Flex>
  );
}
