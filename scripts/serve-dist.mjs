#!/usr/bin/env node
// Serves an app's PRODUCTION build so E2E can load the artifact that actually
// ships, not the dev server.
//
// Why this exists: a Playwright suite pointed only at `vite dev` / `next dev`
// proves nothing about the built output. The dev server rewrites away exactly
// the deploy-specific configuration — `base`/`basePath`, asset URLs, hashed
// chunk names — that breaks a real deployment. That blind spot is how a
// mood-diner build which 404'd every asset in the Android WebView passed E2E,
// a11y, and the live Pages deploy at once.
//
// Usage:
//   node scripts/serve-dist.mjs --dist dist --port 5179
//   node scripts/serve-dist.mjs --dist dist --port 5179 --prefix /repo/app
//
// With --prefix, a SECOND server starts on <port>+1 serving the build only
// under that subpath. Two ports, never one with two mounts: a single server
// answering both would resolve a subpath-pinned asset URL at the root mount
// too, so a bundle that is broken at the root origin would still "boot" and the
// test would pass. Each origin must know only itself. (Proven the hard way —
// the one-port version passed on a build that was genuinely broken.)
//
// Zero dependencies, to match the rest of the harness tooling.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, resolve } from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const distDir = resolve(arg('dist', 'dist'));
const rootPort = Number(arg('port', 5179));
const prefix = (arg('prefix', '') || '').replace(/\/+$/, '');

if (!existsSync(distDir)) {
  console.error(`[serve-dist] No build at ${distDir}. Build the app before serving it.`);
  process.exit(1);
}

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
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/**
 * @param {number} port
 * @param {string} mount '' serves at the root; otherwise only paths under it.
 */
function serve(port, mount) {
  return createServer(async (req, res) => {
    // Fixed readiness endpoint, so Playwright's webServer wait never depends on
    // the app bundle being correct — otherwise a broken build would look like a
    // server startup timeout instead of a test failure.
    if (req.url === '/__ready') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('ready');
    }

    let path = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);

    if (mount) {
      if (path === mount) path = '/';
      else if (path.startsWith(mount + '/')) path = path.slice(mount.length);
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
      // A real 404 with no SPA index.html fallback, deliberately: a fallback
      // would mask the exact failure this exists to catch, since a misrouted
      // asset URL would silently return HTML and the test would pass.
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    }
  });
}

if (prefix) {
  serve(rootPort + 1, prefix).listen(rootPort + 1, () => {
    console.log(`[serve-dist] deploy subpath : http://localhost:${rootPort + 1}${prefix}/`);
  });
}
serve(rootPort, '').listen(rootPort, () => {
  console.log(`[serve-dist] root origin   : http://localhost:${rootPort}/`);
});
