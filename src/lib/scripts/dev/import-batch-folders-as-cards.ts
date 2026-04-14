/**
 * Batch-import every discovered leaf folder under a root as a gallery card (same as admin Import folder per leaf).
 *
 * Usage (repo root):
 *   npx tsx -r dotenv/config src/lib/scripts/dev/import-batch-folders-as-cards.ts "<rootPath>" [--limit=N]
 *
 * `rootPath`: absolute under ONEDRIVE_ROOT_FOLDER or relative (e.g. zMomDadPics).
 * Re-runs are safe: folders already imported are reported as `exists`.
 * Folders over IMPORT_FOLDER_MAX_IMAGES are recorded as `error` and the batch continues.
 */
import path from 'path';
import fs from 'fs';
import { batchImportFoldersAsCards } from '@/lib/services/importFolderAsCard';

function rootArgToRelative(arg: string): string {
  const root = process.env.ONEDRIVE_ROOT_FOLDER?.trim();
  if (!root) {
    throw new Error('ONEDRIVE_ROOT_FOLDER is not set in .env');
  }
  const resolvedRoot = path.resolve(root);
  const trimmed = arg.trim().replace(/^\/+/, '');

  if (path.isAbsolute(trimmed)) {
    const asAbsolute = path.resolve(trimmed);
    const rootLower = resolvedRoot.toLowerCase();
    const absLower = asAbsolute.toLowerCase();
    if (absLower === rootLower || absLower.startsWith(rootLower + path.sep)) {
      const rel = path.relative(resolvedRoot, asAbsolute);
      if (rel.startsWith('..')) {
        throw new Error(`Folder is outside ONEDRIVE_ROOT_FOLDER:\n  ${asAbsolute}\n  root: ${resolvedRoot}`);
      }
      return rel.split(path.sep).join('/');
    }
    throw new Error(
      `Absolute folder must lie under ONEDRIVE_ROOT_FOLDER:\n  ${asAbsolute}\n  root: ${resolvedRoot}`
    );
  }

  return trimmed.split(path.sep).join('/');
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const maxFolders = limitArg ? parseInt(limitArg.split('=')[1] || '', 10) : undefined;

  const arg = args[0];
  if (!arg) {
    console.error(
      'Usage: npx tsx -r dotenv/config src/lib/scripts/dev/import-batch-folders-as-cards.ts "<rootPath>" [--limit=N]'
    );
    process.exit(1);
  }

  const rootPath = rootArgToRelative(arg);
  console.log('Batch root (relative):', rootPath);
  if (maxFolders && maxFolders > 0) {
    console.log('Limit:', maxFolders, 'folders');
  }

  const progressPath = path.join(process.cwd(), 'tools', 'import-batch-folders-as-cards-progress.jsonl');
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.writeFileSync(progressPath, '', 'utf8');

  const started = Date.now();
  const result = await batchImportFoldersAsCards(rootPath, {
    maxFolders: maxFolders && maxFolders > 0 ? maxFolders : undefined,
    onFolderDone: (row, index, total) => {
      fs.appendFileSync(
        progressPath,
        JSON.stringify({ at: new Date().toISOString(), index: index + 1, total, ...row }) + '\n',
        'utf8'
      );
    },
  });

  const summary = {
    elapsedMs: Date.now() - started,
    totalDiscoveredProcessed: result.folderResults.length,
    totalCreated: result.totalCreated,
    totalSkippedExisting: result.totalSkippedExisting,
    totalErrors: result.totalErrors,
  };
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));

  const logPath = path.join(process.cwd(), 'tools', 'import-batch-folders-as-cards-last.json');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify({ summary, folderResults: result.folderResults }, null, 2), 'utf8');
  console.log('Full log written to', logPath);
  console.log('Per-folder progress (JSONL):', progressPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
