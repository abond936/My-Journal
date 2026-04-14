/**
 * Import one folder as a gallery card (same as admin Import folder).
 *
 * Usage (from repo root):
 *   npx tsx -r dotenv/config src/lib/scripts/dev/import-single-folder.ts "<folderPath>"
 *
 * Pass either a path under ONEDRIVE_ROOT_FOLDER (absolute) or the same relative form the UI uses.
 */
import path from 'path';
import { importFolderAsCard } from '@/lib/services/importFolderAsCard';

function folderArgToRelative(arg: string): string {
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
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      'Usage: npx tsx -r dotenv/config src/lib/scripts/dev/import-single-folder.ts "<folderPath>"'
    );
    process.exit(1);
  }

  const folderPath = folderArgToRelative(arg);
  console.log('Relative import path:', folderPath);

  const result = await importFolderAsCard(folderPath);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
