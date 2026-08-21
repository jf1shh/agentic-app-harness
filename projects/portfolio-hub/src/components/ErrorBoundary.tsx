import React from 'react';

/**
 * Top-level crash boundary (.agents/AGENTS.md §12).
 *
 * React unmounts the whole tree when a render, lifecycle or effect throws, so
 * without a boundary the user is left looking at a blank white page with no
 * way forward — the worst possible failure for an app shipped through the Play
 * Store, where a blank screen is indistinguishable from a broken install.
 *
 * Nothing here is reported off-device — portfolio-hub makes no network calls at application runtime.
 *
 * Vite has no framework-level boundary convention (unlike Next.js's
 * `error.tsx`), so this is the class-component equivalent: `componentDidCatch`
 * for reporting, `getDerivedStateFromError` for the fallback render.
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Console only, and deliberately never rendered into the DOM: an error
    // message or component stack can quote the very user data this app keeps
    // on-device, so surfacing it on screen would put it somewhere a
    // screenshot, a screen-share or a bystander can read.
    console.error('Unhandled error caught by ErrorBoundary', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

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
          The app hit an unexpected error and stopped. Your saved data is still on this device —
          reloading usually clears it.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
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
          Reload the app
        </button>
      </div>
    );
  }
}
