// Serves the PRODUCTION build (dist/) at both origins this bundle ships to, so
// the E2E suite can load the real artifact instead of only the dev server.
//
// Why this exists: every other spec runs against `vite dev`, where base is '/'
// and assets are served from the root. That is structurally incapable of
// catching a wrong production `base` — which is exactly how a build that boots
// to a blank screen in the Android WebView passed the whole suite, Playwright
// and the live Pages deploy. See [guardrail: capacitor-absolute-base].
//
// TWO SEPARATE PORTS, deliberately — not one port with two mounts:
//   :PORT     serves dist/ at the root  → Capacitor WebView (https://localhost/)
//   :PORT+1   serves dist/ only under /agentic-app-harness/mood-diner/ → Pages
//
// The separation is the whole point. A single port answering both would resolve
// a '/agentic-app-harness/mood-diner/...' asset URL even when mounted at the
// root, so a bundle pinned to the Pages path would still "boot" at the WebView
// origin and the test would pass while the shipped app was broken. Each server
// knows only its own origin, exactly like the real ones.
//
// Zero dependencies, to match the rest of the harness tooling.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, '..', 'dist');
const PAGES_PREFIX = '/agentic-app-harness/mood-diner';
const rootPort = Number(process.argv[2] || 5179);
const pagesPort = rootPort + 1;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/**
 * @param {number} port
 * @param {string} prefix  '' serves at the root; otherwise only paths under it.
 */
function serve(port, prefix) {
  return createServer(async (req, res) => {
    // Fixed readiness endpoint, so Playwright's webServer wait never depends on
    // the app bundle being correct — otherwise a broken build would look like a
    // server startup timeout instead of a test failure.
    if (req.url === '/__ready') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('ready');
    }

    let path = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);

    if (prefix) {
      // This origin exposes the app ONLY under its subpath.
      if (path === prefix) path = '/';
      else if (path.startsWith(prefix + '/')) path = path.slice(prefix.length);
      else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('not found');
      }
    }

    if (path.endsWith('/')) path += 'index.html';

    // Contain traversal: resolve inside dist/ or refuse.
    const filePath = join(distDir, normalize(path).replace(/^([/\\])+/, ''));
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('forbidden');
    }

    try {
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      // Deliberately a real 404 with no SPA index.html fallback: a fallback
      // would mask the exact failure this suite exists to catch (a misrouted
      // asset URL would silently return HTML and "pass").
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    }
  });
}

serve(pagesPort, PAGES_PREFIX).listen(pagesPort, () => {
  console.log(`[serve-dist] Pages subpath  : http://localhost:${pagesPort}${PAGES_PREFIX}/`);
});
serve(rootPort, '').listen(rootPort, () => {
  console.log(`[serve-dist] WebView origin : http://localhost:${rootPort}/`);
});
