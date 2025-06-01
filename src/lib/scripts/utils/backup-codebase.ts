/**
 * Codebase Backup Script
 * 
 * Purpose: Creates a compressed backup of the codebase to OneDrive
 * 
 * Required Environment Variables:
 * - ONEDRIVE_PATH: Path to OneDrive root directory
 * 
 * Output:
 * - Creates a timestamped backup directory in OneDrive/Codebase Backups/
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

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Debug dotenv loading
const result = dotenv.config();
console.log('\nDotenv config result:', result);
console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', resolve(process.cwd(), '.env'));

import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('ONEDRIVE_PATH:', process.env.ONEDRIVE_PATH);

// Validate required environment variables
const requiredEnvVars = ['ONEDRIVE_PATH'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`- ${varName}`));
  process.exit(1);
}

async function backupCodebase() {
  let output = '';
  let success = true;
  
  try {
    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.env.ONEDRIVE_PATH || '', 'Codebase Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // Create backup directory
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    output += `\n=== Starting Codebase Backup ===\n`;
    output += `Timestamp: ${new Date().toISOString()}\n`;
    output += `Backup path: ${backupPath}\n`;

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const zipPath = path.join(backupPath, 'codebase-backup.zip');
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

    // Pipe archive data to the file
    archive.pipe(outputStream);

    // Add files to the archive, excluding unnecessary directories
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

    // Get all files in the project directory
    const projectRoot = process.cwd();
    const files = getAllFiles(projectRoot, excludeDirs);

    // Add each file to the archive
    for (const file of files) {
      const relativePath = path.relative(projectRoot, file);
      archive.file(file, { name: relativePath });
    }

    // Finalize the archive
    await archive.finalize();

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

    fs.writeFileSync(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    output += `\nBackup completed successfully\n`;
    output += `Total files: ${files.length}\n`;
    output += `Backup size: ${(metadata.backupSize / 1024 / 1024).toFixed(2)} MB\n`;
    output += `Latest commit: ${commitHash}\n`;

    // Clean up old backups (keep last 5)
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-'))
      .sort()
      .reverse();

    if (backups.length > 5) {
      output += `\n=== Cleaning up old backups ===\n`;
      for (const oldBackup of backups.slice(5)) {
        const oldBackupPath = path.join(backupDir, oldBackup);
        fs.rmSync(oldBackupPath, { recursive: true, force: true });
        output += `Deleted old backup: ${oldBackup}\n`;
      }
    }

    // Write backup output to file
    const outputFile = path.join(backupPath, 'backup-output.txt');
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
    
    // Skip excluded directories
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

backupCodebase(); 