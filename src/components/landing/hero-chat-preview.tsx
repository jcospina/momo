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
    text: "18 doctor's appointment",
    isOwn: true,
    time: '6:20 PM',
  },
];

const MESSAGE_INTERVAL_MS = 2200;
const PROCESSED_DELAY_MS = 320;
const REDUCED_MOTION_PREVIEW = 3;

type Appearance = {
  appearanceId: number;
  msg: ChatPreviewMessage;
  processed: boolean;
};

type ChatPreviewProps = {
  ariaLabel: string;
  className?: string;
};

export function HeroChatPreview({ ariaLabel, className }: ChatPreviewProps) {
  const t = useTranslations('landing.hero.chatPreview');
  const [items, setItems] = useState<Appearance[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (media?.matches) {
      setItems(
        MESSAGES.slice(0, REDUCED_MOTION_PREVIEW).map((msg, i) => ({
          appearanceId: i,
          msg,
          processed: true,
        })),
      );
      return;
    }

    let counter = 0;
    const timeouts = new Set<number>();

    const addMessage = () => {
      const id = counter++;
      const msg = MESSAGES[id % MESSAGES.length];
      setItems(prev => [...prev, { appearanceId: id, msg, processed: false }]);
      const tid = window.setTimeout(() => {
        timeouts.delete(tid);
        setItems(prev =>
          prev.map(item =>
            item.appearanceId === id ? { ...item, processed: true } : item,
          ),
        );
      }, PROCESSED_DELAY_MS);
      timeouts.add(tid);
    };

    addMessage();
    const intervalId = window.setInterval(addMessage, MESSAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      timeouts.forEach(tid => window.clearTimeout(tid));
    };
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    if (items.length <= 1) {
      thread.scrollTop = thread.scrollHeight;
      return;
    }
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [items.length]);

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
