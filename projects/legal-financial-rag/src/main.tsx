import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// The CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY` in index.html are
// delivered via <meta http-equiv>, which browsers silently ignore for both
// directives (frame-ancestors is meta-unsupported by spec; X-Frame-Options is
// HTTP-header-only) — and GitHub Pages, this app's deploy target, has no
// mechanism to send custom response headers. Without this, a page claiming
// clickjacking protection would have none. Comparing window.top to window.self
// and writing to window.top.location are both permitted cross-origin
// specifically so a framed page can bust out of the frame; only *reading*
// a cross-origin window.top's properties would throw, and this never does.
if (window.top && window.top !== window.self) {
  window.top.location.href = window.self.location.href;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
