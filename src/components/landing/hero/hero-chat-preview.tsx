'use client';

import { ChatMessageBubble } from '@components/chat/chat-message-bubble';
import { useGSAP } from '@gsap/react';
import { Avatar } from '@ui/avatar/avatar';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { GroupIcon } from '@ui/icons/group';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatComposerMock } from './chat-composer-mock';
import styles from './hero-chat-preview.module.css';

gsap.registerPlugin(SplitText, useGSAP);

type ChatPreviewMessage = {
  id: string;
  sender: string;
  initial: string;
  avatarColor: 'mauve-magic' | 'sky-aqua' | 'amber-glow';
  text: string;
  isOwn: boolean;
  time: string;
};

type SequenceTemplate = Pick<
  ChatPreviewMessage,
  'id' | 'isOwn' | 'initial' | 'avatarColor'
>;

type DesktopMessageCopy = {
  text: string;
  sender: string;
  time: string;
};

const SEQUENCE_TEMPLATE: SequenceTemplate[] = [
  { id: 'lunch', isOwn: true, initial: 'A', avatarColor: 'sky-aqua' },
  { id: 'coffee', isOwn: false, initial: 'S', avatarColor: 'mauve-magic' },
  { id: 'uber', isOwn: true, initial: 'A', avatarColor: 'sky-aqua' },
  { id: 'groceries', isOwn: false, initial: 'S', avatarColor: 'mauve-magic' },
  { id: 'movie', isOwn: false, initial: 'S', avatarColor: 'mauve-magic' },
];

const MAX_THREAD_ITEMS = 8;
const REDUCED_MOTION_PREVIEW = 3;

const TIMINGS = {
  initialDelayMs: 400,
  typewriterCharMs: 55,
  postTypePauseMs: 220,
  sendPressMs: 220,
  postSendPauseMs: 160,
  incomingGapMs: 800,
  samFromSamExtraMs: 900,
  preCheckDelayMs: 600,
  postCheckPauseMs: 750,
  loopRestartDelayMs: 1500,
};

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
  const sequence = useMemo<ChatPreviewMessage[]>(() => {
    const copy =
      (t.raw('desktop.messages') as DesktopMessageCopy[] | undefined) ?? [];
    return SEQUENCE_TEMPLATE.map((tpl, i) => ({
      ...tpl,
      text: copy[i]?.text ?? '',
      sender: copy[i]?.sender ?? '',
      time: copy[i]?.time ?? '',
    }));
  }, [t]);
  const [items, setItems] = useState<Appearance[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;
    setItems(
      sequence.slice(0, REDUCED_MOTION_PREVIEW).map((msg, i) => ({
        appearanceId: i,
        msg,
        processed: true,
      })),
    );
    counterRef.current = REDUCED_MOTION_PREVIEW;
  }, [reducedMotion, sequence]);

  useGSAP(
    (_context, contextSafe) => {
      if (reducedMotion) return;
      if (!contextSafe) return;
      const typedEl = typedRef.current;
      const sendEl = sendRef.current;
      if (!typedEl || !sendEl) return;

      let currentSplit: SplitText | null = null;
      const revertSplit = () => {
        if (currentSplit) {
          currentSplit.revert();
          currentSplit = null;
        }
      };

      const addBubble = (msg: ChatPreviewMessage): number => {
        const id = counterRef.current++;
        setItems(prev => {
          const next = [...prev, { appearanceId: id, msg, processed: false }];
          return next.length > MAX_THREAD_ITEMS
            ? next.slice(next.length - MAX_THREAD_ITEMS)
            : next;
        });
        return id;
      };

      const markProcessed = (id: number) => {
        setItems(prev =>
          prev.map(item =>
            item.appearanceId === id ? { ...item, processed: true } : item,
          ),
        );
      };

      const charDur = 0.05;
      const stagger = TIMINGS.typewriterCharMs / 1000;

      const typeMessage = contextSafe((text: string) => {
        revertSplit();
        typedEl.textContent = text;
        currentSplit = new SplitText(typedEl, { type: 'chars,words' });
        gsap.set(currentSplit.chars, { opacity: 0, y: 6 });
        gsap.to(currentSplit.chars, {
          opacity: 1,
          y: 0,
          duration: charDur,
          ease: 'power1.out',
          stagger,
        });
      });

      const tl = gsap.timeline({
        delay: TIMINGS.initialDelayMs / 1000,
        repeat: -1,
        repeatDelay: TIMINGS.loopRestartDelayMs / 1000,
      });

      let pendingId = -1;
      let prevWasIncoming = false;

      for (const message of sequence) {
        if (message.isOwn) {
          tl.call(() => typeMessage(message.text));
          const typeDuration =
            charDur + Math.max(0, message.text.length - 1) * stagger;
          tl.to({}, { duration: typeDuration });
          tl.to({}, { duration: TIMINGS.postTypePauseMs / 1000 });
          tl.to(sendEl, {
            scale: 0.88,
            duration: TIMINGS.sendPressMs / 2000,
            ease: 'power2.in',
            transformOrigin: 'center center',
          });
          tl.to(sendEl, {
            scale: 1,
            duration: TIMINGS.sendPressMs / 2000,
            ease: 'back.out(2.4)',
          });
          tl.to({}, { duration: TIMINGS.postSendPauseMs / 1000 });
          tl.call(() => {
            pendingId = addBubble(message);
            revertSplit();
            typedEl.textContent = '';
          });
          tl.to({}, { duration: TIMINGS.preCheckDelayMs / 1000 });
          tl.call(() => markProcessed(pendingId));
          tl.to({}, { duration: TIMINGS.postCheckPauseMs / 1000 });
          prevWasIncoming = false;
        } else {
          const leadInMs =
            TIMINGS.incomingGapMs +
            (prevWasIncoming ? TIMINGS.samFromSamExtraMs : 0);
          tl.to({}, { duration: leadInMs / 1000 });
          tl.call(() => {
            pendingId = addBubble(message);
          });
          tl.to({}, { duration: TIMINGS.preCheckDelayMs / 1000 });
          tl.call(() => markProcessed(pendingId));
          tl.to({}, { duration: TIMINGS.postCheckPauseMs / 1000 });
          prevWasIncoming = true;
        }
      }

      return () => {
        revertSplit();
      };
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    if (items.length <= 1) {
      thread.scrollTop = thread.scrollHeight;
      return;
    }
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [items]);

  return (
    <div
      ref={rootRef}
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
        data-lenis-prevent
      >
        {items.map(item => (
          <div
            key={item.appearanceId}
            className={styles['momo-hero-chat__slot']}
          >
            <ChatMessageBubble
              text={item.msg.text}
              isOwn={item.msg.isOwn}
              timestamp={item.msg.time}
              senderName={item.msg.isOwn ? null : item.msg.sender}
              avatarSlot={
                !item.msg.isOwn ? (
                  <Avatar
                    size="extra-small"
                    displayName={item.msg.initial}
                    color={item.msg.avatarColor}
                  />
                ) : null
              }
              statusSlot={
                item.processed ? (
                  <CircleCheckIcon width={18} height={18} />
                ) : null
              }
              actionsSlot={
                item.msg.isOwn ? <ThreeDotsIcon width={16} height={16} /> : null
              }
            />
          </div>
        ))}
      </div>
      <div className={styles['momo-hero-chat__composer']} aria-hidden="true">
        <ChatComposerMock text="" typedRef={typedRef} sendRef={sendRef} ready />
      </div>
    </div>
  );
}
