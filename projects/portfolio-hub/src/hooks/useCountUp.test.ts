import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp';

// requestAnimationFrame drives the hook's animation, but jsdom's real
// implementation runs on a real clock, which would make these tests slow and
// flaky. Stubbing it lets the test drive frames deterministically, the same
// way useAutoLock.test.ts drives setTimeout with vi.useFakeTimers().
function stubRaf() {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callbacks.push(cb);
    return callbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return {
    flush(time: number) {
      const pending = callbacks.splice(0, callbacks.length);
      pending.forEach((cb) => cb(time));
    },
    pendingCount: () => callbacks.length,
  };
}

describe('useCountUp', () => {
  let nowValue = 0;

  beforeEach(() => {
    nowValue = 0;
    vi.stubGlobal('performance', { now: () => nowValue } as unknown as Performance);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Given a target and duration, When mounted, Then the value starts at zero before any frame runs', () => {
    stubRaf();
    const { result } = renderHook(() => useCountUp(200, 1000));
    expect(result.current).toBe(0);
  });

  it('Given a target and duration, When a frame fires at the full duration, Then the value reaches the target exactly', () => {
    const raf = stubRaf();
    const { result } = renderHook(() => useCountUp(200, 1000));

    nowValue = 1000;
    act(() => raf.flush(1000));

    expect(result.current).toBe(200);
  });

  it('Given a target and duration, When a frame fires halfway through, Then the value is roughly half the target', () => {
    const raf = stubRaf();
    const { result } = renderHook(() => useCountUp(200, 1000));

    nowValue = 500;
    act(() => raf.flush(500));

    expect(result.current).toBe(100);
  });

  it('Given the user prefers reduced motion, When the hook mounts, Then it renders the target immediately with no animation frame scheduled', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }) as MediaQueryList);
    const raf = stubRaf();

    const { result } = renderHook(() => useCountUp(75, 900));

    expect(result.current).toBe(75);
    expect(raf.pendingCount()).toBe(0);
  });

  it('Given a hook that unmounts mid-animation, When the pending frame would otherwise fire, Then it is cancelled and no error is thrown', () => {
    const raf = stubRaf();
    const { unmount } = renderHook(() => useCountUp(50, 1000));

    unmount();

    expect(() => raf.flush(1000)).not.toThrow();
  });
});
