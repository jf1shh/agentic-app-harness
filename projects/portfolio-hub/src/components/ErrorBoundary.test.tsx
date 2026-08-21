import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

/** A child that throws on render, standing in for any crashing component. */
function Exploding(): React.ReactNode {
  throw new Error('kaboom: secret-user-data-12345');
}

function Working(): React.ReactNode {
  return <p>normal content</p>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('Given a child that renders normally, When the boundary renders, Then the child is shown untouched', () => {
    render(
      <ErrorBoundary>
        <Working />
      </ErrorBoundary>,
    );
    expect(screen.getByText('normal content')).toBeTruthy();
  });

  it('Given a child that throws during render, When the boundary catches it, Then a recovery message is shown instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('Given a child that throws, When the fallback is shown, Then it offers the user a way to recover', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /reload the app/i })).toBeTruthy();
  });

  it('Given a thrown error whose message quotes user data, When the fallback is shown, Then that message is not rendered into the page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );
    expect(container.textContent).not.toContain('secret-user-data-12345');
    expect(container.textContent).not.toContain('kaboom');
  });

  it('Given a child that throws, When the boundary catches it, Then the failure is reported to the console for on-device debugging', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );
    const logged = spy.mock.calls.some((args) =>
      typeof args[0] === 'string' && args[0].includes('ErrorBoundary'),
    );
    expect(logged).toBe(true);
  });
});
