import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elder Care Cost Planner',
  description:
    'Work out what care really costs, how long the money lasts, and how a family can share it. Private, offline, no account.',
};

// No user-scalable=no and no maximum-scale — pinch zoom must keep working, or
// axe flags a WCAG 1.4.4 text-zoom violation (`viewport-no-zoom` guardrail).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
