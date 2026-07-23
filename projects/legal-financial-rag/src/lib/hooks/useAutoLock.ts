import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom Auto-Lock Inactivity Hook.
 * Monitors user mouse/keyboard interactions and triggers vault lock after idle timeout.
 */

export function useAutoLock(
  isLocked: boolean,
  onLockTriggered: () => void,
  timeoutMs: number = 300000 // Default 5 minutes
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLocked) {
      timerRef.current = setTimeout(() => {
        onLockTriggered();
      }, timeoutMs);
    }
  }, [isLocked, onLockTriggered, timeoutMs]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetTimer]);
}
