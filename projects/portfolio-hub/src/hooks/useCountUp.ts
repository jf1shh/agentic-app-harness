import { useEffect, useRef, useState } from 'react';
import { computeCountUpValue } from '../utils/countUp';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Animates a number from 0 up to `target` over `durationMs`, skipping the animation entirely under prefers-reduced-motion. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || durationMs <= 0) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      setValue(computeCountUpValue(target, elapsed, durationMs));
      if (elapsed < durationMs) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}
