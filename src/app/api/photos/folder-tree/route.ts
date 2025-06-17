// src/app/api/photos/folder-tree/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TreeNode } from '@/lib/types/photo';

// Define the path to the root directory from environment variables.
const baseDir = process.env.ONEDRIVE_ROOT_FOLDER;

// This function recursively builds a tree structure of the directories.
const getDirectoryTree = (dirPath: string): TreeNode[] => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes: TreeNode[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dirPath, entry.name);
        // We use the relative path from the base directory as the ID
        const relativePath = path.relative(baseDir, fullPath);

        const node: TreeNode = {
          id: relativePath.replace(/\\\\/g, '/'), // Use forward slashes for cross-platform consistency
          name: entry.name,
          children: getDirectoryTree(fullPath),
        };
        nodes.push(node);
      }
    }

    // Sort nodes alphabetically by name
    return nodes.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    // If a directory can't be read (e.g., permissions), just return an empty array.
    console.error(`Could not read directory: ${dirPath}`, error);
    return [];
  }
};

export async function GET() {
  // Ensure the environment variable is set.
  if (!baseDir) {
    console.error('ONEDRIVE_ROOT_FOLDER environment variable not set.');
    return NextResponse.json(
      { message: 'Server configuration error: Root photo folder not specified.' },
      { status: 500 }
    );
  }

  try {
    const tree = getDirectoryTree(baseDir);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Failed to generate folder tree:', error);
    return NextResponse.json(
      { message: 'Error creating folder tree', error: (error as Error).message },
      { status: 500 }
    );
  }
}
