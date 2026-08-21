"use client";

import { useEffect } from 'react';

/**
 * Route-level crash boundary (.agents/AGENTS.md §12).
 *
 * Next.js renders this in place of the segment when a render, lifecycle or
 * effect below it throws. Without it the user is left on a blank page with no
 * way forward — the worst possible failure for an app shipped through the Play
 * Store, where a blank screen is indistinguishable from a broken install.
 *
 * Nothing here is reported off-device: the app's only network call is an anonymous recipe search, and a crash reporter would widen what it sends — a spec change under §11, not a quiet addition.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Console only, and deliberately never rendered into the DOM: an error
    // message or stack can quote the very user data this app keeps on-device,
    // so surfacing it on screen would put it somewhere a screenshot, a
    // screen-share or a bystander can read.
    console.error('Unhandled error caught by the route error boundary', error);
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        padding: '2rem',
        maxWidth: '32rem',
        margin: '3rem auto',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Something went wrong</h1>
      <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
        This page hit an unexpected error and stopped. Your saved data is still on this device —
        trying again usually clears it.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: '1px solid currentColor',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        Try again
      </button>
    </div>
  );
}
