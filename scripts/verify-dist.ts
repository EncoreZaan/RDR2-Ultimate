/**
 * Pre-deployment safety check on dist/ (run in CI before publishing):
 *  - only expected static file types, no source maps, no dotfiles;
 *  - no secrets-looking strings, no source paths from this private repository;
 *  - CSP present, service worker and manifest present;
 *  - size budget for the precached app.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const dist = join(process.cwd(), 'dist');
const ALLOWED = /\.(html|js|css|json|webmanifest|svg|png|woff2?|txt)$/;
const SECRET_PATTERNS = [/gh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /sk-ant-[A-Za-z0-9-]{20,}/];
const LEAKS = [/\/home\/user\//, /RDR2-Ultimate\/src\//, /sourceMappingURL/];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const problems: string[] = [];
const files = await walk(dist);
let total = 0;
for (const f of files) {
  const rel = relative(dist, f);
  total += (await stat(f)).size;
  if (rel.split('/').some((s) => s.startsWith('.'))) problems.push(`dotfile published: ${rel}`);
  if (!ALLOWED.test(rel)) problems.push(`unexpected file type: ${rel}`);
  if (/\.(html|js|css|json|webmanifest|svg)$/.test(rel)) {
    const text = await readFile(f, 'utf8');
    for (const p of SECRET_PATTERNS) if (p.test(text)) problems.push(`secret-like string in ${rel} (${p})`);
    for (const p of LEAKS) if (p.test(text)) problems.push(`source leak in ${rel} (${p})`);
  }
}
const index = await readFile(join(dist, 'index.html'), 'utf8');
if (!index.includes('Content-Security-Policy')) problems.push('index.html has no CSP');
for (const required of ['sw.js', 'manifest.webmanifest', 'data/collectibles.json', 'data/cycles.json']) {
  if (!files.some((f) => relative(dist, f) === required)) problems.push(`missing ${required}`);
}
const MB = total / 1024 / 1024;
if (MB > 8) problems.push(`dist is ${MB.toFixed(1)} MiB (budget 8 MiB)`);

if (problems.length) {
  console.error(`✗ dist/ verification failed:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log(`✓ dist/ verified: ${files.length} files, ${MB.toFixed(2)} MiB, no source maps, no secrets, CSP present.`);
