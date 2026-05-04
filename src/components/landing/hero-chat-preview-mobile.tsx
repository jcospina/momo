'use client';

import { ChatMessageBubble } from '@components/chat/chat-message-bubble';
import { useGSAP } from '@gsap/react';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatComposerMock } from './chat-composer-mock';
import styles from './hero-chat-preview-mobile.module.css';

gsap.registerPlugin(SplitText, useGSAP);

type HeroChatPreviewMobileTimings = {
  initialDelayMs?: number;
  cycleEntryFadeMs?: number;
  typewriterCharMs?: number;
  postTypePauseMs?: number;
  sendPressMs?: number;
  postSendPauseMs?: number;
  inputFadeMs?: number;
  bubbleEnterDelayMs?: number;
  preCheckDelayMs?: number;
  loopRestartDelayMs?: number;
};

const DEFAULT_TIMINGS: Required<HeroChatPreviewMobileTimings> = {
  initialDelayMs: 500,
  cycleEntryFadeMs: 260,
  typewriterCharMs: 70,
  postTypePauseMs: 250,
  sendPressMs: 220,
  postSendPauseMs: 180,
  inputFadeMs: 220,
  bubbleEnterDelayMs: 80,
  preCheckDelayMs: 600,
  loopRestartDelayMs: 1500,
};

const MOBILE_QUERY = '(max-width: 960px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type HeroChatPreviewMobileProps = {
  ariaLabel: string;
  className?: string;
  timings?: HeroChatPreviewMobileTimings;
};

type StageProps = {
  message: string;
  config: Required<HeroChatPreviewMobileTimings>;
  reducedMotion: boolean;
  isFirstCycle: boolean;
  onCycleComplete: () => void;
};

function MobileStage({
  message,
  config,
  reducedMotion,
  isFirstCycle,
  onCycleComplete,
}: StageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const inputPhaseRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);

  const [bubbleVisible, setBubbleVisible] = useState(reducedMotion);
  const [showCheck, setShowCheck] = useState(reducedMotion);
  const [typedReady, setTypedReady] = useState(reducedMotion);

  useGSAP(
    () => {
      if (reducedMotion) return;

      const typedEl = typedRef.current;
      const inputEl = inputPhaseRef.current;
      const sendEl = sendRef.current;
      if (!typedEl || !inputEl || !sendEl) return;

      const split = new SplitText(typedEl, { type: 'chars,words' });
      setTypedReady(true);

      gsap.set(sendEl, { scale: 1 });

      const initialDelay = isFirstCycle ? config.initialDelayMs / 1000 : 0;
      const tl = gsap.timeline({ delay: initialDelay });

      if (!isFirstCycle) {
        gsap.set(inputEl, { opacity: 0, y: 4 });
        tl.to(inputEl, {
          opacity: 1,
          y: 0,
          duration: config.cycleEntryFadeMs / 1000,
          ease: 'power2.out',
        });
      }

      gsap.set(split.chars, { opacity: 0, y: 6 });

      tl.to(split.chars, {
        opacity: 1,
        y: 0,
        duration: 0.05,
        ease: 'power1.out',
        stagger: config.typewriterCharMs / 1000,
      });

      tl.to({}, { duration: config.postTypePauseMs / 1000 });

      tl.to(sendEl, {
        scale: 0.88,
        duration: config.sendPressMs / 2000,
        ease: 'power2.in',
        transformOrigin: 'center center',
      }).to(sendEl, {
        scale: 1,
        duration: config.sendPressMs / 2000,
        ease: 'back.out(2.4)',
      });

      tl.to({}, { duration: config.postSendPauseMs / 1000 });

      tl.to(inputEl, {
        opacity: 0,
        y: -4,
        duration: config.inputFadeMs / 1000,
        ease: 'power2.inOut',
        onComplete: () => {
          inputEl.style.pointerEvents = 'none';
        },
      });

      tl.call(
        () => {
          setBubbleVisible(true);
        },
        undefined,
        `+=${config.bubbleEnterDelayMs / 1000}`,
      );

      tl.call(
        () => {
          setShowCheck(true);
        },
        undefined,
        `+=${config.preCheckDelayMs / 1000}`,
      );

      tl.call(
        () => {
          onCycleComplete();
        },
        undefined,
        `+=${config.loopRestartDelayMs / 1000}`,
      );

      return () => {
        split.revert();
      };
    },
    { scope: stageRef, dependencies: [reducedMotion] },
  );

  const statusSlot = showCheck ? (
    <CircleCheckIcon width={18} height={18} />
  ) : null;

  return (
    <div
      ref={stageRef}
      className={styles['momo-hero-chat-mobile__stage']}
      aria-hidden="true"
    >
      <div
        ref={inputPhaseRef}
        className={cn(
          styles['momo-hero-chat-mobile__phase'],
          styles['momo-hero-chat-mobile__phase--input'],
        )}
      >
        <ChatComposerMock
          text={message}
          typedRef={typedRef}
          sendRef={sendRef}
          ready={typedReady}
        />
      </div>
      <div
        className={cn(
          styles['momo-hero-chat-mobile__phase'],
          styles['momo-hero-chat-mobile__phase--bubble'],
        )}
      >
        {bubbleVisible ? (
          <ChatMessageBubble text={message} isOwn statusSlot={statusSlot} />
        ) : null}
      </div>
    </div>
  );
}

export function HeroChatPreviewMobile({
  ariaLabel,
  className,
  timings,
}: HeroChatPreviewMobileProps) {
  const t = useTranslations('landing.hero.chatPreview.mobile');
  const samples = (t.raw('samples') as string[] | undefined) ?? [];
  const config: Required<HeroChatPreviewMobileTimings> = {
    ...DEFAULT_TIMINGS,
    ...timings,
  };

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const [cycleId, setCycleId] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const wasMobileRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqlMobile = window.matchMedia(MOBILE_QUERY);
    const mqlMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    const applyMobile = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (matches && !wasMobileRef.current) {
        setRunToken(t => t + 1);
        setCycleId(0);
        setMessageIdx(0);
      }
      wasMobileRef.current = matches;
    };

    applyMobile(mqlMobile.matches);
    setReducedMotion(mqlMotion.matches);

    const onMobile = (e: MediaQueryListEvent) => applyMobile(e.matches);
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    mqlMobile.addEventListener('change', onMobile);
    mqlMotion.addEventListener('change', onMotion);
    return () => {
      mqlMobile.removeEventListener('change', onMobile);
      mqlMotion.removeEventListener('change', onMotion);
    };
  }, []);

  const handleCycleComplete = useCallback(() => {
    if (samples.length === 0) return;
    setMessageIdx(idx => (idx + 1) % samples.length);
    setCycleId(c => c + 1);
  }, [samples.length]);

  const message = samples[messageIdx] ?? samples[0] ?? '';

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(styles['momo-hero-chat-mobile'], className)}
    >
      {isMobileViewport && message ? (
        <MobileStage
          key={`${runToken}-${cycleId}`}
          message={message}
          config={config}
          reducedMotion={reducedMotion}
          isFirstCycle={cycleId === 0}
          onCycleComplete={handleCycleComplete}
        />
      ) : null}
    </div>
  );
}
