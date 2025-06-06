/**
 * Photo Folder Scanner
 * 
 * Scans the Navy folder and creates a test configuration
 * for the photo integration system.
 */

import fs from 'fs';
import path from 'path';
import { getConfig } from '../services/onedrive/config';
import { AlbumMapping, updateAlbumConfig } from '../services/onedrive/albumConfig';

interface FolderNode {
  name: string;
  path: string;
  photoCount: number;
  children: FolderNode[];
  selected: boolean;
  files?: string[];
}

function scanFolder(folderPath: string): FolderNode {
  const name = path.basename(folderPath);
  const node: FolderNode = {
    name,
    path: folderPath,
    photoCount: 0,
    children: [],
    selected: false,
    files: []
  };

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  
  // Get photos in this folder
  const photos = entries.filter(entry => 
    entry.isFile() && 
    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'].includes(path.extname(entry.name).toLowerCase())
  );
  
  node.photoCount = photos.length;
  node.files = photos.map(photo => photo.name);

  // Process subfolders
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const childPath = path.join(folderPath, entry.name);
      const childNode = scanFolder(childPath);
      node.children.push(childNode);
      node.photoCount += childNode.photoCount;
    }
  }

  return node;
}

function printTree(node: FolderNode, level: number = 0, prefix: string = ''): string {
  const indent = '  '.repeat(level);
  const hasPhotos = node.photoCount > 0;
  const marker = hasPhotos ? '📸' : '📁';
  const selection = node.selected ? '✓' : ' ';
  
  let output = `${indent}${prefix}${marker} ${selection} ${node.name} (${node.photoCount} photos)\n`;
  
  if (node.files && node.files.length > 0) {
    output += `${indent}  Files:\n`;
    node.files.forEach(file => {
      output += `${indent}    - ${file}\n`;
    });
  }
  
  for (const child of node.children) {
    output += printTree(child, level + 1, '├─ ');
  }
  
  return output;
}

function convertToAlbumMappings(node: FolderNode, basePath: string): AlbumMapping[] {
  const mappings: AlbumMapping[] = [];
  
  if (node.selected && node.photoCount > 0) {
    mappings.push({
      folderPath: path.relative(basePath, node.path),
      albumName: node.name,
      description: `Album containing ${node.photoCount} photos`,
      isEnabled: true
    });
  }
  
  for (const child of node.children) {
    mappings.push(...convertToAlbumMappings(child, basePath));
  }
  
  return mappings;
}

async function main() {
  const config = getConfig();
  const navyPath = path.join(config.rootPath, 'zmomdadpics', 'a1Bob', '03 Other', 'Navy');
  
  if (!fs.existsSync(navyPath)) {
    console.error(`Error: Navy directory not found at ${navyPath}`);
    return;
  }

  console.log('Scanning Navy directory...\n');
  
  const rootNode = scanFolder(navyPath);
  rootNode.selected = true; // Select the Navy folder for testing
  
  const output = printTree(rootNode);
  
  // Write the folder structure to a file
  const outputPath = path.join(process.cwd(), 'temp', 'navy-structure.txt');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  
  // Create test configuration
  const albumMappings = convertToAlbumMappings(rootNode, config.rootPath);
  const configPath = path.join(process.cwd(), 'temp', 'navy-config.json');
  fs.writeFileSync(configPath, JSON.stringify(albumMappings, null, 2));
  
  console.log(`\nFolder structure has been written to: ${outputPath}`);
  console.log(`Test configuration has been written to: ${configPath}`);
  console.log('\nNext steps:');
  console.log('1. Review the folder structure and configuration files');
  console.log('2. Use this configuration to test photo integration');
}

main().catch(console.error); 