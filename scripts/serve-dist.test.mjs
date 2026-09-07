import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';

const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const dir = mkdtempSync(join(tmpdir(), 'harness-static-'));
writeFileSync(join(dir, 'index.html'), 'fixture');
const child = spawn(process.execPath, ['scripts/serve-dist.mjs', '--dist', dir, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
function get(path) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end();
  });
}
try {
  await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('exit', () => reject(new Error('server exited'))); });
  assert.equal(await get('/%E0%A4%A'), 400, 'Given malformed URL encoding, When requested, Then return 400');
  assert.equal(await get('/'), 200, 'Given malformed prior request, When opening site, Then server remains available');
  console.log('Static-server malformed request and recovery checks passed.');
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  rmSync(dir, { recursive: true, force: true });
}
