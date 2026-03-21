#!/usr/bin/env node

console.log('Testing required libraries...\n');

// Test Sharp library
console.log('1. Testing Sharp library...');
try {
  const sharp = require('sharp');
  console.log('   ✅ Sharp library loaded successfully');
  
  // Test basic Sharp functionality
  const version = sharp.versions;
  console.log(`   ✅ Sharp version: ${version.sharp}`);
} catch (error) {
  console.log('   ❌ Sharp library error:', error.message);
  console.log('   Please install with: npm install sharp');
  process.exit(1);
}

// Test exif-reader library (optional)
console.log('\n2. Testing exif-reader library...');
try {
  const ExifReader = require('exif-reader');
  console.log('   ✅ Exif-reader library loaded successfully');
} catch (error) {
  console.log('   ⚠️  Exif-reader library not found (optional)');
  console.log('   Install with: npm install exif-reader for better EXIF parsing');
}

// Test file system operations
console.log('\n3. Testing file system operations...');
try {
  const fs = require('fs').promises;
  const fsSync = require('fs');
  
  // Test synchronous fs operations
  const currentDir = process.cwd();
  const exists = fsSync.existsSync(currentDir);
  console.log(`   ✅ Synchronous fs operations working (current dir exists: ${exists})`);
  
  // Test async fs operations
  const files = await fs.readdir(currentDir);
  console.log(`   ✅ Async fs operations working (found ${files.length} files in current directory)`);
} catch (error) {
  console.log('   ❌ File system error:', error.message);
  process.exit(1);
}

// Test path operations
console.log('\n4. Testing path operations...');
try {
  const path = require('path');
  const testPath = path.join('test', 'file.jpg');
  const ext = path.extname(testPath);
  console.log(`   ✅ Path operations working (test path: ${testPath}, ext: ${ext})`);
} catch (error) {
  console.log('   ❌ Path operations error:', error.message);
  process.exit(1);
}

console.log('\n✅ All library tests passed!');
console.log('The metadata extraction script should work correctly.');
console.log('\nTo run metadata extraction:');
console.log('  node extract-image-metadata-enhanced.js <directory-path>'); 