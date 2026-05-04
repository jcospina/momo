'use client';
import { cn } from '@utils/cn';
import { useEffect, useRef } from 'react';
import styles from './dot-grid.module.css';

type DotGridProps = {
  /** Spacing in pixels between dot centres. @default 32 */
  gridSize?: number;
  /** Base radius of each dot in pixels. @default 2 */
  dotRadius?: number;
  /** Radius (px) of the mouse-proximity blast effect. @default 80 */
  blastRadius?: number;
  /** Extra diameter (px) added to dots at the blast centre. @default 3 */
  blastStrength?: number;
  /** RGB colour string for dots, e.g. `'255,255,255'`. @default '255,255,255' */
  baseColor?: string;
  /** Resting opacity of each dot (0–1). @default 0.6 */
  baseOpacity?: number;
  /** Opacity of dots at the blast centre on hover (0–1). @default 0.95 */
  hoverOpacity?: number;
  /** Multiplier for dot density — values > 1 pack dots tighter. @default 1 */
  density?: number;
  /** When `true`, the hover blast animation is disabled. @default false */
  disableHover?: boolean;
  /** Extra class name for placement-specific layering. */
  className?: string;
  /** Positioning mode for the canvas. @default 'fixed' */
  position?: 'absolute' | 'fixed';
};

/**
 * Decorative full-viewport canvas that draws a grid of dots with an
 * interactive hover "blast" effect.
 *
 * Renders a fixed-position `<canvas>` with `pointer-events: none` and
 * `aria-hidden`, so it sits behind all content as a background decoration.
 * The grid automatically resizes on window resize and respects
 * `devicePixelRatio` for crisp rendering on HiDPI displays.
 *
 * **Client component** — requires `'use client'`.
 *
 * @example Default — subtle white dot grid with hover blast
 * ```tsx
 * <DotGrid />
 * ```
 *
 * @example Custom appearance — denser, coral-tinted, static
 * ```tsx
 * <DotGrid
 *   baseColor="255,127,80"
 *   density={1.5}
 *   dotRadius={3}
 *   disableHover
 * />
 * ```
 */
export default function DotGrid({
  gridSize = 32,
  dotRadius = 2,
  blastRadius = 80,
  blastStrength = 3,
  baseColor = '255,255,255',
  baseOpacity = 0.6,
  hoverOpacity = 0.95,
  density = 1,
  disableHover = false,
  className,
  position = 'fixed',
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // use local non-null aliases so inner functions don't need nullable checks
    const c = canvas as HTMLCanvasElement;
    const g = ctx as CanvasRenderingContext2D;

    let width = 0;
    let height = 0;
    // cached grid metrics (recomputed on resize only)
    let cols = 0;
    let rows = 0;
    let offset = gridSize * 0.5 * density;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      if (position === 'fixed') {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        const parent = c.parentElement;
        width = parent?.clientWidth || window.innerWidth;
        height = parent?.scrollHeight || window.innerHeight;
      }
      c.style.width = width + 'px';
      c.style.height = height + 'px';
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // recompute grid metrics when viewport or grid props change
      cols = Math.ceil(width / gridSize / density);
      rows = Math.ceil(height / gridSize / density);
      offset = (gridSize * density) / 2;
      draw();
    }

    function onMove(e: MouseEvent) {
      if (disableHover) return;
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current =
        x < 0 || y < 0 || x > width || y > height ? null : { x, y };
      scheduleDraw();
    }

    function onLeave() {
      if (disableHover) return;
      mouseRef.current = null;
      scheduleDraw();
    }

    function scheduleDraw() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        draw();
        rafRef.current = null;
      });
    }

    function draw() {
      g.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = c * gridSize * density + offset;
          const y = r * gridSize * density + offset;

          let diameter = dotRadius * 2;
          let opacity = baseOpacity;

          if (mouse && !disableHover) {
            const dx = mouse.x - x;
            const dy = mouse.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= blastRadius) {
              const nd = dist / blastRadius; // 0..1
              const ease = 1 - Math.pow(nd, 1.8);
              const extra = blastStrength * ease;
              diameter = Math.max(diameter, diameter + extra);
              opacity = baseOpacity + (hoverOpacity - baseOpacity) * ease;
            }
          }

          g.beginPath();
          g.fillStyle = `rgba(${baseColor}, ${opacity})`;
          g.arc(x, y, diameter / 2, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    resize();
    const resizeObserver =
      position === 'absolute' && 'ResizeObserver' in window
        ? new ResizeObserver(resize)
        : null;
    if (resizeObserver && c.parentElement) {
      resizeObserver.observe(c.parentElement);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      resizeObserver?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    gridSize,
    dotRadius,
    blastRadius,
    blastStrength,
    baseColor,
    baseOpacity,
    hoverOpacity,
    density,
    disableHover,
    position,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(styles.dotGrid, className)}
      aria-hidden
      style={{ position, inset: 0, pointerEvents: 'none' }}
    />
  );
}
