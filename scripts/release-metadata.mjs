#!/usr/bin/env node
// Treat workflow input as data; validate before writing line-based outputs.
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const OUTPUTS = {
  'mood-diner': 'dist', 'portfolio-hub': 'dist', 'legal-financial-rag': 'dist',
  'travel-packing-app': 'out', 'smart-recipe-app': 'out', 'elder-care-planner': 'out',
};
export function resolveRelease({ event, app, version, tag }) {
  if (event === 'push') {
    const split = tag.lastIndexOf('-v');
    app = tag.slice(0, split);
    version = tag.slice(split + 1);
  } else if (event !== 'workflow_dispatch') throw new Error('Unsupported release event');
  if (!Object.hasOwn(OUTPUTS, app)) throw new Error('Unknown release app');
  if (typeof version !== 'string' || version.trim() !== version || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(version)) {
    throw new Error('Version must be vMAJOR.MINOR.PATCH with an optional prerelease suffix');
  }
  return { app, version, tag: `${app}-${version}`, out: OUTPUTS[app] };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const metadata = resolveRelease({ event: process.env.GITHUB_EVENT_NAME,
    app: process.env.RELEASE_APP, version: process.env.RELEASE_VERSION, tag: process.env.GITHUB_REF_NAME });
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(metadata).map(([key, value]) => `${key}=${value}\n`).join(''));
}
