'use client';

import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { Button } from '@ui/button/button';
import { Highlight } from '@ui/highlight/highlight';
import { Logo } from '@ui/logo/logo';
import { Typography } from '@ui/typography/typography';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import styles from './closer-section.module.css';

gsap.registerPlugin(SplitText, useGSAP);

export function CloserSection() {
  const t = useTranslations('landing.closer');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const sectionRef = useRef<HTMLElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const highlightRef = useRef<HTMLSpanElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, { threshold: 0.4, once: true });

  useGSAP(
    () => {
      if (reducedMotion) return;

      const logo = logoRef.current;
      const title = titleRef.current;
      const highlight = highlightRef.current;
      const sub = subRef.current;
      const cta = ctaRef.current;
      if (!logo || !title || !highlight || !sub || !cta) return;

      gsap.set(logo, { scale: 0.8, opacity: 0, transformOrigin: 'center' });
      gsap.set(title, { opacity: 0 });
      gsap.set([sub, cta], { opacity: 0, y: 6 });

      if (!inView) return;

      const split = new SplitText(title, { type: 'chars,words' });
      const nonHighlightChars = split.chars.filter(c => !highlight.contains(c));
      const highlightChars = split.chars.filter(c => highlight.contains(c));

      gsap.set(title, { opacity: 1 });
      gsap.set(nonHighlightChars, { opacity: 0, y: 8 });
      gsap.set(highlightChars, { opacity: 1, y: 0 });
      gsap.set(highlight, { clipPath: 'inset(0 100% 0 0)' });

      const tl = gsap.timeline();
      tl.to(logo, {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: 'back.out(2)',
      });
      tl.to(
        nonHighlightChars,
        {
          opacity: 1,
          y: 0,
          duration: 0.05,
          ease: 'power1.out',
          stagger: 0.04,
        },
        '-=0.1',
      );
      tl.to(
        highlight,
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.45,
          ease: 'power2.inOut',
        },
        '+=0.05',
      );
      tl.to(
        sub,
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
        '+=0.1',
      );
      tl.to(
        cta,
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
        '-=0.15',
      );

      return () => {
        split.revert();
        tl.kill();
      };
    },
    { scope: sectionRef, dependencies: [inView, reducedMotion] },
  );

  return (
    <section ref={sectionRef} className={styles['momo-landing-closer']}>
      <div className={styles['momo-landing-closer__lockup']}>
        <div ref={logoRef} className={styles['momo-landing-closer__logo']}>
          <Logo />
        </div>
        <Typography
          as="h2"
          size="display"
          weight="bold"
          ref={titleRef}
          className={styles['momo-landing-closer__title']}
        >
          {t.rich('title', {
            br: () => <br />,
            stamp: chunks => (
              <Highlight
                ref={highlightRef}
                variant="feature"
                rotation="right"
                animate={!reducedMotion}
              >
                {chunks}
              </Highlight>
            ),
          })}
        </Typography>
      </div>
      <Typography
        size="lg"
        ref={subRef}
        className={styles['momo-landing-closer__sub']}
      >
        {t('sub')}
      </Typography>
      <div ref={ctaRef} className={styles['momo-landing-closer__cta-wrap']}>
        <Button
          variant="primary"
          asLink
          href="/login"
          className={styles['momo-landing-closer__cta']}
        >
          {t('cta')}
        </Button>
      </div>
    </section>
  );
}
