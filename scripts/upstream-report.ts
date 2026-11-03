/**
 * Builds a Markdown report of what changed upstream since the vendored commit,
 * classified by impact on our app. Used by the weekly "upstream watch"
 * workflow to open/update a tracking issue. Never modifies the repository.
 *
 *   npm run upstream:report [-- --out report.md]
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ghOutput, git, TRACKED_FILES, UPSTREAM_BRANCH, UPSTREAM_GIT, UPSTREAM_REPO, type UpstreamMeta } from './upstream-lib.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

type Bucket = 'data-synced' | 'data-other' | 'translations' | 'features' | 'styles-assets' | 'infra' | 'other';

export function classify(path: string): Bucket {
  if ((TRACKED_FILES as readonly string[]).includes(path)) return 'data-synced';
  if (path.startsWith('data/')) return 'data-other';
  if (path.startsWith('langs/')) return 'translations';
  if (path.startsWith('assets/js/') || path === 'index.html') return 'features';
  if (path.startsWith('assets/')) return 'styles-assets';
  if (path.startsWith('.github/') || path === 'package.json' || path === 'service-worker.js') return 'infra';
  return 'other';
}

const LABELS: Record<Bucket, string> = {
  'data-synced': '🔄 Données déjà synchronisées automatiquement',
  'data-other': '🗂️ Autres données (nouvelles sources possibles)',
  translations: '🌐 Traductions (non synchronisées : seules en/fr sont suivies)',
  features: '✨ Code applicatif (fonctionnalités à évaluer)',
  'styles-assets': '🎨 Styles et ressources (souvent non réutilisables : ressources du jeu)',
  infra: '⚙️ Infrastructure upstream',
  other: '📄 Divers',
};

async function main(): Promise<void> {
  const outIdx = process.argv.indexOf('--out');
  const out = outIdx >= 0 ? process.argv[outIdx + 1] : undefined;
  const meta = JSON.parse(await readFile(join(root, 'upstream/UPSTREAM.json'), 'utf8')) as UpstreamMeta;
  const dir = await mkdtemp(join(tmpdir(), 'rdr2u-upstream-'));
  try {
    // Partial clone: history and trees only, no file contents.
    await git(['clone', '--quiet', '--filter=blob:none', '--no-checkout', '--single-branch', '--branch', UPSTREAM_BRANCH, UPSTREAM_GIT, dir]);
    const head = await git(['rev-parse', 'HEAD'], dir);
    let range = `${meta.commit}..${head}`;
    try {
      await git(['cat-file', '-e', `${meta.commit}^{commit}`], dir);
    } catch {
      range = `${head}~50..${head}`; // vendored commit unknown (force-push upstream?)
    }
    const log = await git(['log', '--no-merges', '--format=%H%x09%ad%x09%s', '--date=short', range], dir);
    const commits = log ? log.split('\n').map((l) => l.split('\t')) : [];
    const files = (await git(['diff', '--name-only', range.replace('..', '...')], dir).catch(() => '')).split('\n').filter(Boolean);

    const buckets = new Map<Bucket, string[]>();
    for (const f of files) {
      const b = classify(f);
      buckets.set(b, [...(buckets.get(b) ?? []), f]);
    }
    const needsReview = (buckets.get('features')?.length ?? 0) + (buckets.get('data-other')?.length ?? 0) > 0;

    const lines: string[] = [
      `## Suivi upstream — ${UPSTREAM_REPO}`,
      ``,
      `Commit vendu dans ce dépôt : [\`${meta.commit.slice(0, 7)}\`](https://github.com/${UPSTREAM_REPO}/commit/${meta.commit}) · dernier commit upstream : [\`${head.slice(0, 7)}\`](https://github.com/${UPSTREAM_REPO}/commit/${head})`,
      ``,
      commits.length === 0 ? '_Aucun nouveau commit._' : `**${commits.length} commit(s)**, **${files.length} fichier(s)** modifiés.`,
      ``,
    ];
    for (const [bucket, label] of Object.entries(LABELS) as [Bucket, string][]) {
      const list = buckets.get(bucket);
      if (!list?.length) continue;
      lines.push(`### ${label} (${list.length})`, '');
      for (const f of list.slice(0, 40)) lines.push(`- [\`${f}\`](https://github.com/${UPSTREAM_REPO}/blob/${head}/${f})`);
      if (list.length > 40) lines.push(`- … et ${list.length - 40} autre(s)`);
      lines.push('');
    }
    if (commits.length) {
      lines.push('<details><summary>Commits</summary>', '');
      for (const [sha, date, subject] of commits.slice(0, 100)) {
        lines.push(`- ${date} [\`${sha?.slice(0, 7)}\`](https://github.com/${UPSTREAM_REPO}/commit/${sha}) ${subject?.replace(/[<>]/g, '')}`);
      }
      lines.push('', '</details>', '');
    }
    lines.push(
      '### Procédure',
      '',
      '1. Les fichiers de données suivis sont synchronisés chaque jour par le workflow **Upstream data sync** (validés + testés avant intégration).',
      '2. Pour le code applicatif : lire les diffs, décider si la fonctionnalité apporte quelque chose, puis la **réimplémenter** dans notre architecture (voir `docs/UPSTREAM.md`). Ne jamais copier aveuglément.',
      '3. Fermer ce ticket une fois l’analyse faite ; il sera rouvert/mis à jour automatiquement au prochain changement.',
    );
    const report = lines.join('\n');
    if (out) await writeFile(out, report);
    else console.log(report);
    await ghOutput({ needs_review: String(needsReview), head, commits: String(commits.length) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
