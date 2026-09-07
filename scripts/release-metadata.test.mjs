import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRelease } from './release-metadata.mjs';

test('Given release input, When valid, Then return only known app and version metadata', () => {
  assert.deepEqual(resolveRelease({ event: 'workflow_dispatch', app: 'mood-diner', version: 'v1.2.3' }),
    { app: 'mood-diner', version: 'v1.2.3', tag: 'mood-diner-v1.2.3', out: 'dist' });
  assert.equal(resolveRelease({ event: 'push', tag: 'elder-care-planner-v2.0.1-rc.1' }).out, 'out');
});
test('Given hostile release input, When resolved, Then reject before emitting workflow outputs', () => {
  for (const app of ['../..', 'unknown', 'mood-diner\ninjected=value', '$(touch /tmp/no)']) {
    assert.throws(() => resolveRelease({ event: 'workflow_dispatch', app, version: 'v1.2.3' }));
  }
  for (const version of ['v1.2.3"; exit 0; #', 'v1.2.3\nout=x', '../x', '--help', 'v1.2.3\n', '']) {
    assert.throws(() => resolveRelease({ event: 'workflow_dispatch', app: 'mood-diner', version }));
  }
});

// The workflow must preserve the safe parser boundary instead of expanding input as shell source.
const { readFileSync } = await import('node:fs');
const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
for (const block of workflow.matchAll(/run: \|\n((?: {10}[^\n]*\n)+)/g)) {
  assert.ok(!block[1].includes('${{'), 'Given release workflow scripts, When inspected, Then input is supplied through environment variables');
}
assert.ok(workflow.includes('--target "$GITHUB_SHA"'), 'Manual releases target the verified checkout');
