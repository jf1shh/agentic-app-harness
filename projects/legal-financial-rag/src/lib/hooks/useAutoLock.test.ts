import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoLock } from './useAutoLock';

// Auto-lock is one of LexiVault's advertised defence-in-depth layers: an
// unattended vault must re-lock itself so a decrypted corpus is not left on
// screen. Every failure mode here is silent — the vault simply stays open — and
// no E2E test in the suite waits five minutes to notice, which is exactly why
// these belong at the unit level with fake timers.
//
// Backfilled coverage (.agents/AGENTS.md §5): the module already worked, so
// there was no Red step. Each assertion below was proved by mutation instead —
// see the PR body for the mutation applied and the case that caught it.

const TIMEOUT_MS = 300_000; // the hook's documented 5-minute default

describe('useAutoLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Given an unlocked vault, When the idle timeout elapses with no activity, Then the vault is locked exactly once', () => {
    const onLockTriggered = vi.fn();
    renderHook(() => useAutoLock(false, onLockTriggered, TIMEOUT_MS));

    expect(onLockTriggered).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS);
    });

    expect(onLockTriggered).toHaveBeenCalledTimes(1);
  });

  it('Given an unlocked vault, When the timeout has not yet elapsed, Then the vault is still open', () => {
    const onLockTriggered = vi.fn();
    renderHook(() => useAutoLock(false, onLockTriggered, TIMEOUT_MS));

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - 1);
    });

    expect(onLockTriggered).not.toHaveBeenCalled();
  });

  // The whole point of the hook: a user who is still working must not be locked
  // out mid-sentence. Each listed event has to reset the countdown, so they are
  // asserted individually rather than as one representative sample.
  it.each(['mousemove', 'keydown', 'mousedown', 'touchstart'])(
    'Given an idle countdown near expiry, When the user produces a %s, Then the countdown restarts from zero',
    (eventName) => {
      const onLockTriggered = vi.fn();
      renderHook(() => useAutoLock(false, onLockTriggered, TIMEOUT_MS));

      act(() => {
        vi.advanceTimersByTime(TIMEOUT_MS - 1_000);
        window.dispatchEvent(new Event(eventName));
      });

      // Past the ORIGINAL deadline — only a reset keeps the vault open here.
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(onLockTriggered).not.toHaveBeenCalled();

      // A full fresh timeout from the moment of activity still locks it.
      act(() => {
        vi.advanceTimersByTime(TIMEOUT_MS);
      });
      expect(onLockTriggered).toHaveBeenCalledTimes(1);
    },
  );

  it('Given a vault that is already locked, When the idle timeout elapses, Then no further lock is triggered', () => {
    const onLockTriggered = vi.fn();
    renderHook(() => useAutoLock(true, onLockTriggered, TIMEOUT_MS));

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS * 3);
    });

    expect(onLockTriggered).not.toHaveBeenCalled();
  });

  it('Given a locked vault, When user activity occurs, Then it does not arm a timer that would re-lock later', () => {
    const onLockTriggered = vi.fn();
    renderHook(() => useAutoLock(true, onLockTriggered, TIMEOUT_MS));

    act(() => {
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(TIMEOUT_MS * 2);
    });

    expect(onLockTriggered).not.toHaveBeenCalled();
  });

  it('Given a mounted hook, When the component unmounts before the timeout, Then the pending lock never fires', () => {
    const onLockTriggered = vi.fn();
    const { unmount } = renderHook(() => useAutoLock(false, onLockTriggered, TIMEOUT_MS));

    unmount();

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS * 2);
    });

    expect(onLockTriggered).not.toHaveBeenCalled();
  });

  it('Given an unmounted hook, When user activity occurs afterwards, Then its listeners are gone and nothing is armed', () => {
    const onLockTriggered = vi.fn();
    const { unmount } = renderHook(() => useAutoLock(false, onLockTriggered, TIMEOUT_MS));

    unmount();

    act(() => {
      window.dispatchEvent(new Event('mousemove'));
      vi.advanceTimersByTime(TIMEOUT_MS * 2);
    });

    expect(onLockTriggered).not.toHaveBeenCalled();
  });

  it('Given a caller-supplied timeout, When that shorter interval elapses, Then the vault locks on the caller’s schedule, not the default', () => {
    const onLockTriggered = vi.fn();
    const shortTimeout = 1_000;
    renderHook(() => useAutoLock(false, onLockTriggered, shortTimeout));

    act(() => {
      vi.advanceTimersByTime(shortTimeout);
    });

    expect(onLockTriggered).toHaveBeenCalledTimes(1);
  });

  it('Given no timeout argument, When 5 minutes of inactivity elapse, Then the documented default applies', () => {
    const onLockTriggered = vi.fn();
    renderHook(() => useAutoLock(false, onLockTriggered));

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - 1);
    });
    expect(onLockTriggered).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onLockTriggered).toHaveBeenCalledTimes(1);
  });

  it('Given an unlocked vault, When it becomes locked mid-countdown, Then the pending unlock-era timer is discarded', () => {
    const onLockTriggered = vi.fn();
    const { rerender } = renderHook(
      ({ isLocked }) => useAutoLock(isLocked, onLockTriggered, TIMEOUT_MS),
      { initialProps: { isLocked: false } },
    );

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - 1_000);
    });

    rerender({ isLocked: true });

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS * 2);
    });

    expect(onLockTriggered).not.toHaveBeenCalled();
  });
});
