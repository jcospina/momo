'use client';

import { useGSAP } from '@gsap/react';
import { useInView } from '@hooks/use-in-view';
import { useMediaQuery } from '@hooks/use-media-query';
import { cn } from '@utils/cn';
import gsap from 'gsap';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import styles from './scene-shell.module.css';

gsap.registerPlugin(useGSAP);

type SceneLayout = 'title-left' | 'title-right';

type SceneShellProps = {
  id?: string;
  statement: ReactNode;
  artifact: ReactNode;
  /** Tilt applied to the artifact at rest, in degrees. */
  tilt?: number;
  /** Which side the title sits on at desktop. */
  layout?: SceneLayout;
  /** Optional desktop width share for the statement column. */
  statementDesktopBasis?: string;
  /** Optional desktop width share for the artifact column. */
  artifactDesktopBasis?: string;
  /** Optional max-width on the artifact column (px). */
  artifactMaxWidth?: number;
  className?: string;
};

export function SceneShell({
  id,
  statement,
  artifact,
  tilt = 0,
  layout = 'title-left',
  statementDesktopBasis,
  artifactDesktopBasis,
  artifactMaxWidth,
  className,
}: SceneShellProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const artifactRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const inView = useInView(sectionRef, { threshold: 0.2, once: true });

  useGSAP(
    () => {
      const artEl = artifactRef.current;
      const stmtEl = statementRef.current;
      if (!artEl || !stmtEl) return;

      if (reducedMotion) {
        gsap.set(artEl, { rotation: tilt, opacity: 1, y: 0 });
        gsap.set(stmtEl, { opacity: 1, y: 0 });
        return;
      }

      if (!inView) {
        gsap.set(artEl, { rotation: 0, opacity: 0, y: 24 });
        gsap.set(stmtEl, { opacity: 0, y: 12 });
        return;
      }

      const tl = gsap.timeline();
      tl.fromTo(
        stmtEl,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' },
      );
      tl.fromTo(
        artEl,
        { rotation: 0, opacity: 0, y: 24 },
        { rotation: tilt, opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
        '-=0.3',
      );
    },
    { scope: sectionRef, dependencies: [inView, reducedMotion, tilt] },
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      className={cn(
        styles['momo-scene'],
        styles[`momo-scene--${layout}`],
        className,
      )}
      style={{
        ...(statementDesktopBasis
          ? {
              ['--scene-statement-desktop-basis' as string]:
                statementDesktopBasis,
            }
          : {}),
        ...(artifactDesktopBasis
          ? {
              ['--scene-artifact-desktop-basis' as string]:
                artifactDesktopBasis,
            }
          : {}),
        ...(artifactMaxWidth
          ? {
              ['--scene-artifact-desktop-max-width' as string]: `${artifactMaxWidth}px`,
            }
          : {}),
      }}
    >
      <div ref={statementRef} className={styles['momo-scene__statement']}>
        {statement}
      </div>
      <div ref={artifactRef} className={styles['momo-scene__artifact']}>
        {artifact}
      </div>
    </section>
  );
}
