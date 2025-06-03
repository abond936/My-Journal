/**
 * Codebase Backup Script
 * 
 * Purpose: Creates a compressed backup of the codebase to OneDrive
 * 
 * Output:
 * - Creates a timestamped backup directory in C:\Users\alanb\CodeBase Backups\
 * - Saves backup as ZIP file
 * - Includes metadata with git information
 * - Maintains last 5 backups
 * - Logs operations to temp/backup/codebase-backup-output.txt
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
  let files: string[] = [];
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
    // Create backup directory if it doesn't exist
    const backupDir = 'C:\\Users\\alanb\\CodeBase Backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    const zipPath = path.join(backupDir, `backup-${timestamp}.zip`);

    output += `\n=== Starting Codebase Backup ===\n`;
    output += `Timestamp: ${new Date().toISOString()}\n`;
    output += `Backup path: ${zipPath}\n`;

    // Create a zip archive with standard compression
    const archive = archiver('zip', {
      zlib: { level: 6 } // Standard compression
    });

    const outputStream = fs.createWriteStream(zipPath);

    // Handle archive events
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        output += `Warning: ${err.message}\n`;
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      throw err;
    });

    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      outputStream.on('close', () => {
        output += `\nArchive finalized. Total bytes: ${archive.pointer()}\n`;
        resolve(true);
      });

      outputStream.on('end', () => {
        output += 'Data has been drained\n';
      });

      outputStream.on('error', (err) => {
        reject(err);
      });

      // Pipe archive data to the file
      archive.pipe(outputStream);

      // Get all files in the project directory
      const projectRoot = process.cwd();
      files = getAllFiles(projectRoot, excludeDirs);

      // Add each file to the archive
      for (const file of files) {
        const relativePath = path.relative(projectRoot, file);
        archive.file(file, { name: relativePath });
      }

      // Finalize the archive
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
      excludedDirs: excludeDirs,
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
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    output += `\nBackup completed successfully\n`;
    output += `Total files: ${files.length}\n`;
    output += `Backup size: ${(metadata.backupSize / 1024 / 1024).toFixed(2)} MB\n`;
    output += `Latest commit: ${commitHash}\n`;

    // Clean up old backups (keep last 5)
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.zip'))
      .sort()
      .reverse();

    if (backups.length > 5) {
      output += `\n=== Cleaning up old backups ===\n`;
      for (const oldBackup of backups.slice(5)) {
        const oldBackupPath = path.join(backupDir, oldBackup);
        const oldMetadataPath = path.join(backupDir, oldBackup.replace('.zip', '-metadata.json'));
        fs.rmSync(oldBackupPath, { force: true });
        if (fs.existsSync(oldMetadataPath)) {
          fs.rmSync(oldMetadataPath, { force: true });
        }
        output += `Deleted old backup: ${oldBackup}\n`;
      }
    }

    // Write backup output to file
    const outputFile = path.join(backupDir, `backup-${timestamp}-output.txt`);
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
  } finally {
    // Exit with appropriate status code
    process.exit(success ? 0 : 1);
  }
}

function getAllFiles(dirPath: string, excludeDirs: string[], arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!excludeDirs.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, excludeDirs, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Run the backup
backupCodebase(); 