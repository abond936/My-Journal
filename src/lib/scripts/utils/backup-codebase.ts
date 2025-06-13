/**
 * Codebase Backup Script
 * 
 * Purpose: Creates a compressed backup of the codebase
 * 
 * Output:
 * - For OneDrive: Creates a timestamped backup in C:\Users\alanb\CodeBase Backups\
 * - For GitHub: Creates a backup in temp/backup/
 * - Saves backup as ZIP file
 * - Includes metadata with git information
 * - Logs operations to output file
 * 
 * Recent Changes:
 * - Added Firebase configuration backup
 * - Added migration data backup
 * - Added script categorization
 * - Added style organization
 * - Added component organization
 */

import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { execSync } from 'child_process';

async function backupCodebase() {
  let output = '';
  let success = true;
  const files: string[] = [];
  const excludeDirs = [
    'node_modules',
    '.next',
    'out',
    'dist',
    'build',
    '.git',
    'temp',
    '.cursor',
    'coverage',
    'exports'
  ];
  
  try {
    // Determine if we're running in GitHub Actions
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    
    // Set backup directory based on environment
    const backupDir = isGitHubActions 
      ? path.join(process.cwd(), 'temp', 'backup')
      : 'C:\\Users\\alanb\\CodeBase Backups';

    if (!fs.existsSync(backupDir)) {
      console.log(`Creating backup directory: ${backupDir}`);
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    const zipPath = path.join(backupDir, `backup-${timestamp}.zip`);

    const startMsg = `\n=== Starting Codebase Backup ===`;
    console.log(startMsg);
    output += `${startMsg}\n`;
    
    const timeMsg = `Timestamp: ${new Date().toISOString()}`;
    console.log(timeMsg);
    output += `${timeMsg}\n`;

    const pathMsg = `Backup path: ${zipPath}`;
    console.log(pathMsg);
    output += `${pathMsg}\n`;

    const envMsg = `Environment: ${isGitHubActions ? 'GitHub Actions' : 'Local'}`;
    console.log(envMsg);
    output += `${envMsg}\n`;

    // Create a zip archive with maximum compression
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const outputStream = fs.createWriteStream(zipPath);

    // Handle archive events
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        const warningMsg = `Warning: ${err.message}`;
        console.warn(warningMsg);
        output += `${warningMsg}\n`;
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      throw err;
    });

    // Wait for the write stream to finish
    await new Promise<void>((resolve, reject) => {
      outputStream.on('close', () => {
        const closeMsg = `\nArchive finalized. Total bytes: ${archive.pointer()}`;
        console.log(closeMsg);
        output += `${closeMsg}\n`;
        resolve();
      });

      outputStream.on('end', () => {
        output += 'Data has been drained\n';
      });

      outputStream.on('error', (err) => {
        reject(err);
      });

      // Pipe archive data to the file
      archive.pipe(outputStream);

      // Get all files from git, respecting .gitignore. This is fast and accurate.
      console.log('\nGathering file list from git...');
      const gitFiles = execSync('git ls-files --cached --others --exclude-standard')
        .toString()
        .trim()
        .split('\n');
      
      console.log(`Found ${gitFiles.length} files to archive.`);
      files.push(...gitFiles);

      // Add each file to the archive
      for (const file of files) {
        // The path from git is already relative to the project root
        archive.file(file, { name: file });
      }

      // Finalize the archive
      console.log('Finalizing archive... (this may take a moment)');
      archive.finalize();
    });

    // Get git commit hash for reference
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      commitHash,
      commitMessage,
      fileCount: files.length,
      backupSize: fs.statSync(zipPath).size,
      environment: isGitHubActions ? 'GitHub Actions' : 'Local',
      recentChanges: [
        'Added Firebase configuration backup',
        'Added migration data backup',
        'Added script categorization',
        'Added style organization',
        'Added component organization'
      ]
    };

    // Write metadata to a separate file
    const metadataPath = path.join(backupDir, `backup-${timestamp}-metadata.json`);
    console.log(`\nWriting metadata to ${metadataPath}`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    const completeMsg = `\nBackup completed successfully`;
    console.log(completeMsg);
    output += `${completeMsg}\n`;

    const fileCountMsg = `Total files: ${files.length}`;
    console.log(fileCountMsg);
    output += `${fileCountMsg}\n`;

    const sizeMsg = `Backup size: ${(metadata.backupSize / 1024 / 1024).toFixed(2)} MB`;
    console.log(sizeMsg);
    output += `${sizeMsg}\n`;

    const commitMsg = `Latest commit: ${commitHash}`;
    console.log(commitMsg);
    output += `${commitMsg}\n`;

    // Clean up old backups (only for local backups)
    if (!isGitHubActions) {
      const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.zip'))
        .sort()
        .reverse();

      if (backups.length > 5) {
        const cleanupMsg = `\n=== Cleaning up old backups ===`;
        console.log(cleanupMsg);
        output += `${cleanupMsg}\n`;
        for (const oldBackup of backups.slice(5)) {
          const oldBackupPath = path.join(backupDir, oldBackup);
          const oldMetadataPath = path.join(backupDir, oldBackup.replace('.zip', '-metadata.json'));
          fs.rmSync(oldBackupPath, { force: true });
          if (fs.existsSync(oldMetadataPath)) {
            fs.rmSync(oldMetadataPath, { force: true });
          }
          const deletedMsg = `Deleted old backup: ${oldBackup}`;
          console.log(deletedMsg);
          output += `${deletedMsg}\n`;
        }
      }
    }

    // Write backup output to file
    const outputFile = isGitHubActions
      ? path.join(backupDir, 'codebase-backup-output.txt')
      : path.join(backupDir, `backup-${timestamp}-output.txt`);
    fs.writeFileSync(outputFile, output);
    console.log(`Backup output written to ${outputFile}`);

  } catch (error) {
    success = false;
    output += `\nError during backup:\n`;
    if (error instanceof Error) {
      output += `Message: ${error.message}\n`;
      output += `Stack: ${error.stack}\n`;
    } else {
      output += `${error}\n`;
    }
  }
}

// Main execution wrapper
async function main() {
  try {
    await backupCodebase();
    console.log('\nBackup script completed successfully.');
  } catch (error) {
    console.error('\nError during backup process:');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1; // Signal failure to the OS
  }
}

// Run the backup
main(); 