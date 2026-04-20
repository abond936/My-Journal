/**
 * Dry-run: for every __X-marked image under a root folder, run the same embedded
 * metadata read + keyword→tag resolution as local import. No Storage/Firestore writes
 * except reading the tags collection for name→id maps.
 *
 * @usage
 *   npx ts-node -r dotenv/config -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/dev/dry-run-import-metadata.ts
 *   npx ts-node ... dry-run-import-metadata.ts -- "D:\Other\Photos"
 *
 * Default root: C:\Users\alanb\OneDrive\Pictures\zMomDadPics
 *
 * Output: console + tools/dry-run-import-metadata-report.txt (UTF-8 BOM)
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { getAllTags } from '@/lib/firebase/tagService';
import {
  buildTagNameLookupMaps,
  readEmbeddedCaptionAndKeywords,
  resolveKeywordStringsToTagIds,
} from '@/lib/services/images/embeddedMetadataForImport';
import { isCardExportMarkedFilename } from '@/lib/services/images/inMemoryWebpNormalize';

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif']);

const DEFAULT_ROOT = path.join('C:', 'Users', 'alanb', 'OneDrive', 'Pictures', 'zMomDadPics');
const REPORT_REL = path.join('tools', 'dry-run-import-metadata-report.txt');

function parseArgs(): string {
  const argv = process.argv.slice(2);
  const dash = argv.indexOf('--');
  if (dash >= 0 && argv[dash + 1]) {
    return path.resolve(argv[dash + 1]!);
  }
  if (argv[0] && !argv[0].startsWith('-')) {
    return path.resolve(argv[0]);
  }
  return DEFAULT_ROOT;
}

async function* walkDirs(root: string): AsyncGenerator<string> {
  yield root;
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      yield* walkDirs(path.join(root, e.name));
    }
  }
}

async function collectMarkedFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  for await (const dir of walkDirs(root)) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (!SUPPORTED.has(ext)) continue;
      if (!isCardExportMarkedFilename(e.name)) continue;
      out.push(path.join(dir, e.name));
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

interface Row {
  file: string;
  ok: boolean;
  error?: string;
  captionLen: number;
  keywordCount: number;
  resolvedTagCount: number;
  unmapped: string[];
}

async function main() {
  const root = parseArgs();
  const reportLines: string[] = [];

  const log = (s: string) => {
    console.log(s);
    reportLines.push(s);
  };

  log(`=== Dry run: import metadata (ExifTool + tag map) ===`);
  log(`Generated: ${new Date().toISOString()}`);
  log(`Root: ${root}`);
  log('');

  let exists = true;
  try {
    await fs.access(root);
  } catch {
    exists = false;
  }
  if (!exists) {
    log(`ERROR: Root not found or not accessible: ${root}`);
    await writeReport(reportLines);
    process.exit(1);
  }

  log('Loading tag tree from Firestore...');
  const tagMaps = buildTagNameLookupMaps(await getAllTags());
  log(`Tag names (exact map size): ${tagMaps.exact.size}`);
  log('');

  const files = await collectMarkedFiles(root);
  log(`__X-marked image files found: ${files.length}`);
  log('');

  const rows: Row[] = [];
  const globalUnmapped = new Map<string, number>();

  let i = 0;
  for (const file of files) {
    i++;
    if (i % 100 === 0) {
      console.error(`Progress: ${i}/${files.length}`);
    }
    try {
      const { caption, keywordStrings } = await readEmbeddedCaptionAndKeywords(file);
      const resolvedIds = resolveKeywordStringsToTagIds(keywordStrings, tagMaps);
      const unmapped: string[] = [];
      for (const kw of keywordStrings) {
        const idsForKw = resolveKeywordStringsToTagIds([kw], tagMaps);
        if (idsForKw.length === 0) {
          unmapped.push(kw);
          globalUnmapped.set(kw, (globalUnmapped.get(kw) ?? 0) + 1);
        }
      }
      rows.push({
        file,
        ok: true,
        captionLen: caption.length,
        keywordCount: keywordStrings.length,
        resolvedTagCount: resolvedIds.length,
        unmapped,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rows.push({
        file,
        ok: false,
        error: msg,
        captionLen: 0,
        keywordCount: 0,
        resolvedTagCount: 0,
        unmapped: [],
      });
    }
  }

  const failed = rows.filter((r) => !r.ok);
  const ok = rows.filter((r) => r.ok);
  const withCaption = ok.filter((r) => r.captionLen > 0);
  const withUnmapped = ok.filter((r) => r.unmapped.length > 0);

  log('=== Summary ===');
  log(`Total __X files: ${rows.length}`);
  log(`Read OK: ${ok.length}`);
  log(`Read errors: ${failed.length}`);
  log(`With non-empty caption: ${withCaption.length}`);
  log(`With at least one unmapped keyword: ${withUnmapped.length}`);
  log(`Unique unmapped keyword strings: ${globalUnmapped.size}`);
  log('');

  if (failed.length > 0) {
    log('=== Read errors (ExifTool / IO) ===');
    const maxList = 80;
    failed.slice(0, maxList).forEach((r) => {
      log(`${r.file}`);
      log(`  ${r.error}`);
    });
    if (failed.length > maxList) {
      log(`... and ${failed.length - maxList} more errors`);
    }
    log('');
  }

  if (globalUnmapped.size > 0) {
    log('=== Unmapped keywords (not in app tag name map) — count then label ===');
    const sorted = [...globalUnmapped.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [kw, count] of sorted) {
      log(`${count}\t${kw}`);
    }
    log('');
  }

  const maxSamples = 40;
  if (withUnmapped.length > 0) {
    log(`=== Sample files with unmapped keywords (up to ${maxSamples}) ===`);
    withUnmapped.slice(0, maxSamples).forEach((r) => {
      log(r.file);
      log(`  unmapped: ${r.unmapped.join(' | ')}`);
    });
    if (withUnmapped.length > maxSamples) {
      log(`... and ${withUnmapped.length - maxSamples} more files with unmapped keywords`);
    }
    log('');
  }

  log(`Report written to ${path.resolve(REPORT_REL)}`);
  await writeReport(reportLines);
}

async function writeReport(lines: string[]) {
  const outPath = path.resolve(process.cwd(), REPORT_REL);
  const dir = path.dirname(outPath);
  await fs.mkdir(dir, { recursive: true });
  const utf8Bom = '\uFEFF';
  await fs.writeFile(outPath, utf8Bom + lines.join('\n'), 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
