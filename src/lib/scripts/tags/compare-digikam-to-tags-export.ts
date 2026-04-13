/**
 * Compare `public/digiKamTags.txt` (tab-indented export) to `tags-export.csv`
 * from `npm run export:tags`. Lists digiKam tag names with no exact match in the app.
 *
 * @usage npx tsx src/lib/scripts/tags/compare-digikam-to-tags-export.ts
 * Or: npm run compare:digikam-tags
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { resolve } from 'path';

const ROOT = process.cwd();
const DIGIKAM_PATH = resolve(ROOT, 'public', 'digiKamTags.txt');
const EXPORT_PATH = resolve(ROOT, 'tags-export.csv');
const REPORT_PATH = resolve(ROOT, 'src', 'data', 'migration', 'comparison', 'digikam-vs-app-report.txt');

const SECTION_ROOTS = new Set(['WHAT', 'WHEN', 'WHERE', 'WHO', 'WHO1', 'cardseed']);

function parseDigiKam(content: string): { name: string; section: string; fullPath: string }[] {
  const lines = content.split(/\r?\n/);
  let section = '';
  const pathStack: string[] = [];
  const entries: { name: string; section: string; fullPath: string }[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(/^(\t*)(.*)$/);
    if (!m) continue;
    const tabLen = m[1].length;
    const raw = m[2];
    const name = raw.trim();

    if (tabLen === 0) {
      section = name;
      pathStack.length = 0;
      continue;
    }

    const depth = tabLen;
    pathStack.length = depth;
    pathStack[depth - 1] = name;
    const fullPath = `${section}/${pathStack.join('/')}`;
    entries.push({ name, section, fullPath });
  }

  return entries;
}

function main() {
  if (!fs.existsSync(DIGIKAM_PATH)) {
    console.error(`Missing ${DIGIKAM_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(EXPORT_PATH)) {
    console.error(`Missing ${EXPORT_PATH} — run npm run export:tags first.`);
    process.exit(1);
  }

  const dkContent = fs.readFileSync(DIGIKAM_PATH, 'utf8');
  const dkEntries = parseDigiKam(dkContent);

  const csvRaw = fs.readFileSync(EXPORT_PATH, 'utf8');
  const rows = parse(csvRaw, { columns: true, skip_empty_lines: true, relax_quotes: true }) as Record<
    string,
    string
  >[];

  const appNamesExact = new Set<string>();
  const appNamesLower = new Map<string, string>(); // lower -> first canonical name seen

  for (const row of rows) {
    const n = (row.name ?? '').trim();
    if (!n) continue;
    appNamesExact.add(n);
    const low = n.toLowerCase();
    if (!appNamesLower.has(low)) appNamesLower.set(low, n);
  }

  const dkUniqueNames = [...new Set(dkEntries.map((e) => e.name.trim()).filter(Boolean))];
  const missingExact = dkUniqueNames
    .filter((n) => !SECTION_ROOTS.has(n) && !appNamesExact.has(n))
    .sort((a, b) => a.localeCompare(b));

  const caseOnlyFix: { digiKam: string; inAppAs: string }[] = [];
  for (const n of missingExact) {
    const hit = appNamesLower.get(n.toLowerCase());
    if (hit && hit !== n) caseOnlyFix.push({ digiKam: n, inAppAs: hit });
  }
  const missingAfterCase = missingExact.filter((n) => !appNamesLower.has(n.toLowerCase()));

  const bySection = new Map<string, string[]>();
  for (const name of missingAfterCase) {
    const hit = dkEntries.find((e) => e.name.trim() === name);
    const sec = hit?.section ?? '?';
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec)!.push(name);
  }

  const lines: string[] = [];
  lines.push('digiKam vs app (tags-export.csv)');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`DigiKam file: ${DIGIKAM_PATH}`);
  lines.push(`App export:   ${EXPORT_PATH}`);
  lines.push(`DigiKam tag nodes: ${dkEntries.length}`);
  lines.push(`DigiKam unique names (excl. section roots): ${dkUniqueNames.filter((n) => !SECTION_ROOTS.has(n)).length}`);
  lines.push(`App export rows: ${rows.length}`);
  lines.push(`App unique names (trimmed): ${appNamesExact.size}`);
  lines.push('');
  lines.push('--- DigiKam names with NO app tag (exact name) ---');
  if (missingAfterCase.length === 0) {
    lines.push('(none — every digiKam name has a case-insensitive match in the app.)');
  } else {
    lines.push(`Count: ${missingAfterCase.length}`);
    lines.push('');
    for (const sec of [...bySection.keys()].sort()) {
      const names = bySection.get(sec)!.sort((a, b) => a.localeCompare(b));
      lines.push(`[${sec}] (${names.length})`);
      for (const n of names) lines.push(`  ${n}`);
      lines.push('');
    }
  }

  lines.push('--- Name in digiKam differs only by spelling/case from app ---');
  if (caseOnlyFix.length === 0) {
    lines.push('(none)');
  } else {
    for (const { digiKam, inAppAs } of caseOnlyFix.sort((a, b) => a.digiKam.localeCompare(b.digiKam))) {
      lines.push(`  digiKam: "${digiKam}"  →  app: "${inAppAs}"`);
    }
  }

  lines.push('');
  lines.push('--- Duplicate digiKam labels (same name, different paths) ---');
  const counts = new Map<string, number>();
  for (const e of dkEntries) {
    const n = e.name.trim();
    if (SECTION_ROOTS.has(n)) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const dupes = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  for (const [n, c] of dupes) lines.push(`  ${n}  (${c} paths)`);

  fs.mkdirSync(resolve(REPORT_PATH, '..'), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log(lines.join('\n'));
  console.log(`\nWrote ${REPORT_PATH}`);
}

main();
