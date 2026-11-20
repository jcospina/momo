'use client';

import { ChatRowScope } from '@components/chat/chat-row';
import {
  PreviewChatRow,
  type PreviewSample,
} from '@components/landing/chat-preview';
import { useGSAP } from '@gsap/react';
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
  preCheckDelayMs: 900,
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
  sample: PreviewSample;
  config: Required<HeroChatPreviewMobileTimings>;
  reducedMotion: boolean;
  isFirstCycle: boolean;
  onCycleComplete: () => void;
};

function MobileStage({
  sample,
  config,
  reducedMotion,
  isFirstCycle,
  onCycleComplete,
}: StageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const inputPhaseRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);

  const [isSent, setIsSent] = useState(reducedMotion);
  const [isProcessed, setIsProcessed] = useState(reducedMotion);
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
          setIsSent(true);
        },
        undefined,
        `+=${config.bubbleEnterDelayMs / 1000}`,
      );

      tl.call(
        () => {
          setIsProcessed(true);
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

  return (
    <div ref={stageRef} className={styles['momo-hero-chat-mobile__cycle']}>
      <div
        ref={inputPhaseRef}
        className={cn(
          styles['momo-hero-chat-mobile__phase'],
          styles['momo-hero-chat-mobile__phase--input'],
        )}
      >
        <ChatComposerMock
          text={sample.text}
          typedRef={typedRef}
          sendRef={sendRef}
          ready={typedReady}
        />
      </div>
      <div className={styles['momo-hero-chat-mobile__phase']}>
        {isSent ? (
          <PreviewChatRow
            id="hero-mobile"
            sample={sample}
            author={null}
            isProcessed={isProcessed}
            isGroupStart={false}
            isGroupEnd
            isFresh={!reducedMotion}
          />
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
  const samples = (t.raw('samples') as PreviewSample[] | undefined) ?? [];
  const config: Required<HeroChatPreviewMobileTimings> = {
    ...DEFAULT_TIMINGS,
    ...timings,
  };

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [runToken, setRunToken] = useState(0);
  const [cycleId, setCycleId] = useState(0);
  const [sampleIdx, setSampleIdx] = useState(0);
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
        setSampleIdx(0);
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
    setSampleIdx(idx => (idx + 1) % samples.length);
    setCycleId(c => c + 1);
  }, [samples.length]);

  const sample = samples[sampleIdx] ?? samples[0];

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(styles['momo-hero-chat-mobile'], className)}
    >
      <ChatRowScope
        className={styles['momo-hero-chat-mobile__stage']}
        aria-hidden="true"
        inert
      >
        {sample ? (
          // Reserves the finished ticket's height from the first paint, so
          // the hero never shifts while the cycle swaps composer and ticket.
          <div className={styles['momo-hero-chat-mobile__sizer']}>
            <PreviewChatRow
              id="hero-mobile-sizer"
              sample={sample}
              author={null}
              isProcessed
              isGroupStart={false}
              isGroupEnd
              isFresh={false}
            />
          </div>
        ) : null}
        {isMobileViewport && sample ? (
          <MobileStage
            key={`${runToken}-${cycleId}`}
            sample={sample}
            config={config}
            reducedMotion={reducedMotion}
            isFirstCycle={cycleId === 0}
            onCycleComplete={handleCycleComplete}
          />
        ) : null}
      </ChatRowScope>
    </div>
  );
}
