'use client';
import { useEffect, useRef } from 'react';
import styles from './dot-grid.module.css';

type DotGridProps = {
  gridSize?: number; // px between dot centers
  dotRadius?: number; // radius in px
  blastRadius?: number; // distance in px for blast effect
  blastStrength?: number; // extra diameter in px at center
  baseColor?: string; // rgb string e.g. '255,255,255'
  baseOpacity?: number; // 0..1
  hoverOpacity?: number; // 0..1
  density?: number; // multiplier for dot density (1 = normal)
  disabled?: boolean; // disable rendering on small screens
};

export default function DotGrid({
  gridSize = 32,
  dotRadius = 2,
  blastRadius = 80,
  blastStrength = 3,
  baseColor = '255,255,255',
  baseOpacity = 0.6,
  hoverOpacity = 0.95,
  density = 1,
  disabled = false,
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // use local non-null aliases so inner functions don't need nullable checks
    const c = canvas as HTMLCanvasElement;
    const g = ctx as CanvasRenderingContext2D;

    let width = window.innerWidth;
    let height = window.innerHeight;
    // cached grid metrics (recomputed on resize only)
    let cols = 0;
    let rows = 0;
    let offset = gridSize * 0.5 * density;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
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
      mouseRef.current = { x: e.clientX, y: e.clientY };
      scheduleDraw();
    }

    function onLeave() {
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

          if (mouse) {
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
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
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
    disabled,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.dotGrid}
      aria-hidden
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
    />
  );
}
