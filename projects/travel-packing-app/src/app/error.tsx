"use client";

import React, { useEffect } from 'react';
import { Logger } from '../services/logger';

export default function ErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Log the error to IndexedDB when it's caught
    Logger.error(`React Error Boundary Caught: ${error.message}`, {
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#ef4444' }}>Oops! Something went wrong.</h1>
      <p style={{ color: '#64748b' }}>
        The application encountered a fatal error. We&apos;ve saved the crash details locally.
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Reload Page
        </button>
        <button 
          onClick={() => Logger.exportLogs()}
          style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color, #ccc)', color: 'var(--foreground)', borderRadius: '8px', cursor: 'pointer' }}
        >
          Download Crash Report
        </button>
      </div>
    </div>
  );
}
