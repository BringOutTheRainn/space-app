// Runs every browser check before a release against a fresh build, serving www/ itself on port
// 8766. Usage: npm run release-check  (first time: npm install --no-save playwright && npx playwright install chromium)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../www/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((ok, fail) => server.once('error', fail).listen(8766, '127.0.0.1', ok)).catch((e) => {
  console.log(e.code === 'EADDRINUSE' ? 'Port 8766 is busy; using the server already running there.' : e.message);
});

const CHECKS = [
  ['Random taps in every language', 'tools/monkey.mjs'],
  ['Text fits, no leftover English', 'tools/fit-check.mjs'],
  ['Text fits with Android text at 130%', 'tools/fit-check.mjs', '--zoom=1.3'],
  ['Text contrast', 'tools/contrast-check.mjs'],
  ['Damaged saves', 'tools/ui-save-fuzz.mjs', '40'],
  ['Windows left open and 300 toasts', 'tools/soak.mjs'],
];
const results = [];
for (const [name, script, ...args] of CHECKS) {
  console.log(`\n== ${name}`);
  // Run asynchronously: this process also serves the game, so it must not block.
  const code = await new Promise((done) => spawn(process.execPath, [script, ...args], { stdio: 'inherit' }).on('close', done));
  results.push([name, code === 0]);
}
server.close();
console.log('\nRelease check:');
for (const [name, ok] of results) console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}`);
process.exitCode = results.every(([, ok]) => ok) ? 0 : 1;
