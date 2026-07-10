/**
 * Shared backup run resolution for paired restore.
 */

import fs from 'fs';
import path from 'path';

export function resolvePairedBackupRunDir(inputPath: string): string {
  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup path does not exist: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  const runDir = stat.isDirectory() ? resolved : path.dirname(resolved);

  const firestorePath = path.join(runDir, 'firestore.json');
  const storageManifestPath = path.join(runDir, 'storage-manifest.json');

  const missing: string[] = [];
  if (!fs.existsSync(firestorePath)) {
    missing.push('firestore.json');
  }
  if (!fs.existsSync(storageManifestPath)) {
    missing.push('storage-manifest.json');
  }
  if (missing.length > 0) {
    throw new Error(
      `Backup run is missing required file(s): ${missing.join(', ')}. Prefer a paired run from npm run backup:run -- --apply.`
    );
  }

  return runDir;
}

export function readRunManifestSummary(runDir: string): {
  hasRunManifest: boolean;
  complete: boolean | null;
  sourceProjectId: string | null;
} {
  const manifestPath = path.join(runDir, 'run-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { hasRunManifest: false, complete: null, sourceProjectId: null };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      complete?: boolean;
      sourceProjectId?: string | null;
    };
    return {
      hasRunManifest: true,
      complete: typeof parsed.complete === 'boolean' ? parsed.complete : null,
      sourceProjectId:
        typeof parsed.sourceProjectId === 'string' ? parsed.sourceProjectId : null,
    };
  } catch {
    return { hasRunManifest: true, complete: null, sourceProjectId: null };
  }
}

export function printPostRestoreChecklist(runDir: string): void {
  const indexesPath = path.join(runDir, 'firestore.indexes.json');
  const rulesPath = path.join(runDir, 'firestore.rules');

  console.log('\n=== Post-restore checklist ===');
  if (fs.existsSync(indexesPath)) {
    console.log('- Deploy Firestore indexes if the target project is missing them.');
  }
  if (fs.existsSync(rulesPath)) {
    console.log('- Restore matching firestore.rules before reopening access if rules drifted.');
  }
  console.log('- On disposable targets: enable Storage and allow read on images/** if reader media 403.');
  console.log('- Rebuild Typesense from Firestore when using an isolated drill Typesense config.');
  console.log('- Run npm run build and npm run test:integrity -- --runInBand before reopening access.');
}
