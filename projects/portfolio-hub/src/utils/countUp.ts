/** Pure progress math for an animated numeric count-up; no timers, no DOM. */
export function computeCountUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return target;
  const progress = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return Math.round(target * progress);
}
