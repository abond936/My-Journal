/**
 * Local-only secrets backup
 *
 * Archives repo-root files Git should never hold: `.env*`, `service-account.json`,
 * and `*-firebase-adminsdk-*.json`. The source tree lives on GitHub after push;
 * data lives under `npm run backup:database` (see docs).
 *
 * Local output: `CODEBASE_SECRETS_BACKUP_DIR` or `C:\Users\alanb\CodeBase Backups\`.
 * Keeps the 5 most recent `backup-*.zip` files; writes metadata and a log alongside.
 */

import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { execSync } from 'child_process';

const DEFAULT_WINDOWS_BACKUP_DIR = 'C:\\Users\\alanb\\CodeBase Backups';

function isSecretRootFile(name: string): boolean {
  if (name.startsWith('.env')) return true;
  if (name === 'service-account.json') return true;
  if (/-firebase-adminsdk-.*\.json$/i.test(name)) return true;
  return false;
}

/** Repo-root files only; paths relative to cwd, sorted. */
function collectSecretFilesAtRepoRoot(root: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(root, { withFileTypes: true })) {
    if (!name.isFile()) continue;
    if (isSecretRootFile(name.name)) out.push(name.name);
  }
  return out.sort();
}

async function backupCodebase() {
  let output = '';
  const projectRoot = process.cwd();
  const backupDir =
    process.env.CODEBASE_SECRETS_BACKUP_DIR?.trim() || DEFAULT_WINDOWS_BACKUP_DIR;

  try {
    if (!fs.existsSync(backupDir)) {
      console.log(`Creating backup directory: ${backupDir}`);
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = collectSecretFilesAtRepoRoot(projectRoot);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const startMsg = '\n=== Local secrets backup (GitHub = source) ===';
    console.log(startMsg);
    output += `${startMsg}\n`;

    const timeMsg = `Timestamp: ${new Date().toISOString()}`;
    console.log(timeMsg);
    output += `${timeMsg}\n`;
    output += `Backup directory: ${backupDir}\n`;
    output += `Project root: ${projectRoot}\n`;

    if (files.length === 0) {
      const none =
        'No repo-root .env* or service-account JSON found. Nothing to zip. Source: Git remote; data: backup:database.';
      console.log(none);
      output += `${none}\n`;
      const outputFile = path.join(backupDir, `backup-${timestamp}-output.txt`);
      fs.writeFileSync(outputFile, output);
      console.log(`Log written to ${outputFile}`);
      return;
    }

    console.log(`Files to archive: ${files.join(', ')}`);
    output += `Files: ${files.join(', ')}\n`;

    const zipPath = path.join(backupDir, `backup-${timestamp}.zip`);
    const pathMsg = `Archive: ${zipPath}`;
    console.log(pathMsg);
    output += `${pathMsg}\n`;

    const archive = archiver('zip', { zlib: { level: 9 } });
    const outputStream = fs.createWriteStream(zipPath);

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(`Warning: ${err.message}`);
        output += `Warning: ${err.message}\n`;
      } else {
        throw err;
      }
    });
    archive.on('error', (err) => {
      throw err;
    });

    await new Promise<void>((resolve, reject) => {
      outputStream.on('close', () => {
        const closeMsg = `\nArchive finalized. Total bytes: ${archive.pointer()}`;
        console.log(closeMsg);
        output += `${closeMsg}\n`;
        resolve();
      });
      outputStream.on('error', (err) => {
        reject(err);
      });
      archive.pipe(outputStream);
      for (const file of files) {
        const abs = path.join(projectRoot, file);
        archive.file(abs, { name: file });
      }
      console.log('Finalizing archive...');
      archive.finalize();
    });

    let commitHash = '';
    let commitMessage = '';
    try {
      commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    } catch {
      output += 'Note: not a git repo or git not on PATH; commit info omitted.\n';
    }

    const zipSize = fs.statSync(zipPath).size;
    const metadata = {
      timestamp: new Date().toISOString(),
      purpose: 'local-only secrets; full tree on Git remote',
      commitHash: commitHash || null,
      commitMessage: commitMessage || null,
      fileCount: files.length,
      files,
      backupSize: zipSize,
    };

    const metadataPath = path.join(backupDir, `backup-${timestamp}-metadata.json`);
    console.log(`\nWriting metadata to ${metadataPath}`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    const sizeMsg = `Backup size: ${(metadata.backupSize / 1024 / 1024).toFixed(2)} MB`;
    console.log(sizeMsg);
    output += `${sizeMsg}\n`;
    if (commitHash) {
      const commitMsg = `Latest commit: ${commitHash}`;
      console.log(commitMsg);
      output += `${commitMsg}\n`;
    }

    const backups = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.zip'))
      .sort()
      .reverse();
    if (backups.length > 5) {
      const cleanupMsg = '\n=== Cleaning up old backups (keep 5) ===';
      console.log(cleanupMsg);
      output += `${cleanupMsg}\n`;
      for (const oldBackup of backups.slice(5)) {
        const oldBackupPath = path.join(backupDir, oldBackup);
        const oldMetadataPath = path.join(
          backupDir,
          oldBackup.replace('.zip', '-metadata.json')
        );
        fs.rmSync(oldBackupPath, { force: true });
        if (fs.existsSync(oldMetadataPath)) {
          fs.rmSync(oldMetadataPath, { force: true });
        }
        const deletedMsg = `Deleted old backup: ${oldBackup}`;
        console.log(deletedMsg);
        output += `${deletedMsg}\n`;
      }
    }

    const outputFile = path.join(backupDir, `backup-${timestamp}-output.txt`);
    fs.writeFileSync(outputFile, output);
    console.log(`Backup output written to ${outputFile}`);

    const completeMsg = '\nBackup completed successfully.';
    console.log(completeMsg);
    output += `${completeMsg}\n`;
  } catch (error) {
    output += '\nError during backup:\n';
    if (error instanceof Error) {
      output += `Message: ${error.message}\nStack: ${error.stack}\n`;
    } else {
      output += `${error}\n`;
    }
    throw error;
  }
}

async function main() {
  try {
    await backupCodebase();
    console.log('\nBackup script finished.');
  } catch (error) {
    console.error('\nError during backup process:');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

main();
