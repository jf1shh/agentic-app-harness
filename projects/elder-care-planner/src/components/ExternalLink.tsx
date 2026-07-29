import type { ReactNode } from 'react';

interface Props {
  href: string;
  children: ReactNode;
}

/**
 * External link carrying the AGENTS.md-safe defaults.
 *
 *  - `target="_blank"` opens a new window so the planner is still on screen
 *    afterwards — important because the planner has user-entered state the\n *    family is in the middle of typing and a stray back-button should not\n *    return them to a blank tab.\n *  - `rel="noopener noreferrer"` prevents the opened window from being able\n *    to read or write the parent via `window.opener` (`noopener`) and\n *    prevents it from learning the planner's URL (`noreferrer`). Without\n *    `noopener`, a malicious target can use `window.opener.location.assign`\n *    to silently redirect the planner itself.\n *\n * The visible "(external)" mark is paired with a `visually-hidden` \"opens in\n * a new window\" disclosure so a screen-reader user hears the same warning a\n * sighted user sees, without the literal text appearing in a high-density\n * bullet list.\n */
export function ExternalLink({ href, children }: Props) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="external-link">
      {children}
      <span aria-hidden="true" className="external-mark">
        {' '}
        ↗
      </span>
      <span className="visually-hidden"> (opens in a new window)</span>
    </a>
  );
}
