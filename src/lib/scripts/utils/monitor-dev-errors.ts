/**
 * Dev Server Error Monitor
 * 
 * Purpose: Monitors the Next.js dev server output and logs errors to a file
 * 
 * Usage:
 * 1. Start this script in a separate terminal
 * 2. Start the dev server in another terminal
 * 3. Errors will be logged to temp/dev-errors.txt
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { execSync } from 'child_process';

const ERROR_LOG_FILE = path.join(process.cwd(), 'temp', 'dev-errors.txt');
const CHECK_INTERVAL = 5000; // Check every 5 seconds

// Ensure temp directory exists
if (!fs.existsSync(path.dirname(ERROR_LOG_FILE))) {
  fs.mkdirSync(path.dirname(ERROR_LOG_FILE), { recursive: true });
}

// Clear previous error log
fs.writeFileSync(ERROR_LOG_FILE, '');

// Get the full path to npm
const npmPath = execSync('where npm').toString().trim().split('\n')[0];

// Start the dev server
const devServer = spawn('npm', ['run', 'dev'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

// Handle stdout
devServer.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('error') || output.includes('Error') || output.includes('ERROR')) {
    fs.appendFileSync(ERROR_LOG_FILE, `[${new Date().toISOString()}] ${output}\n`);
  }
});

// Handle stderr
devServer.stderr.on('data', (data) => {
  const output = data.toString();
  fs.appendFileSync(ERROR_LOG_FILE, `[${new Date().toISOString()}] ERROR: ${output}\n`);
});

// Handle process exit
devServer.on('exit', (code) => {
  fs.appendFileSync(ERROR_LOG_FILE, `[${new Date().toISOString()}] Dev server exited with code ${code}\n`);
});

console.log('Monitoring dev server for errors...');
console.log(`Errors will be logged to: ${ERROR_LOG_FILE}`);

// Keep the script running
process.on('SIGINT', () => {
  devServer.kill();
  process.exit();
}); 