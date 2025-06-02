import { readFile, writeFile, access } from 'fs/promises';
import { glob } from 'glob';
import { join, dirname, basename, resolve, relative } from 'path';

interface FileLocation {
  currentPath: string | null;
  proposedPath: string;
  exists: boolean;
}

interface ImportAnalysis {
  importPath: string;
  fileLocation: FileLocation;
  suggestedFix: string;
}

interface FileAnalysis {
  filePath: string;
  imports: ImportAnalysis[];
  proposedLocation: string;
  requiresReview: boolean;
  reviewNotes: string[];
}

interface MigrationPlan {
  filesToMove: {
    from: string;
    to: string;
    confidence: number;
    reviewNotes: string[];
  }[];
  importFixes: {
    file: string;
    currentImport: string;
    suggestedImport: string;
    confidence: number;
  }[];
  missingFiles: {
    importPath: string;
    referencedIn: string[];
  }[];
  summary: {
    totalFiles: number;
    filesToMove: number;
    importFixes: number;
    missingFiles: number;
  };
}

function determineFileType(filePath: string): string {
  const fileName = basename(filePath);
  const dirPath = dirname(filePath);

  // First check if it's in a special directory
  if (dirPath.includes('__tests__')) return 'test';
  if (dirPath.includes('app/')) return 'page';
  if (dirPath.includes('lib/types/')) return 'type';
  if (dirPath.includes('lib/services/')) return 'service';
  if (dirPath.includes('lib/styles/')) return 'style';
  if (dirPath.includes('lib/hooks/')) return 'hook';
  if (dirPath.includes('lib/contexts/')) return 'context';

  // Then check the filename
  if (fileName.includes('test') || fileName.includes('spec')) return 'test';
  if (fileName.includes('page')) return 'page';
  if (fileName.includes('layout')) return 'layout';
  if (fileName.includes('Card')) return 'card';
  if (fileName.includes('View')) return 'content';
  if (fileName.includes('Manager')) return 'admin';
  if (fileName.includes('Nav') || fileName.includes('Tab')) return 'navigation';
  if (fileName.endsWith('.css')) return 'style';
  if (fileName.endsWith('.d.ts')) return 'type';
  if (fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) return 'type';
  return 'component';
}

function mapToNewStructure(filePath: string): string {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('src/app/')) return normalized;
  if (normalized.startsWith('src/lib/services/')) return normalized;
  if (normalized.startsWith('src/lib/hooks/')) return normalized;
  if (normalized.startsWith('src/lib/scripts/')) return normalized;
  if (normalized.startsWith('src/lib/types/')) return normalized;
  if (normalized.startsWith('src/lib/styles/')) return normalized;
  if (normalized.startsWith('src/components/')) return normalized;
  if (normalized.startsWith('src/__tests__/')) return normalized;
  if (normalized.startsWith('src/lib/mocks/')) return normalized;

  const fileName = basename(normalized);
  if (fileName.endsWith('.d.ts') || fileName.endsWith('.types.ts')) {
    return `src/lib/types/${fileName}`;
  }
  if (fileName.endsWith('.test.ts') || fileName.endsWith('.test.tsx')) {
    return `src/__tests__/${fileName}`;
  }
  // Default: shared component
  return `src/components/shared/${fileName}`;
}

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  const content = await readFile(filePath, 'utf-8');
  const imports = extractImports(content);
  const proposedLocation = mapToNewStructure(filePath);
  
  const analysis: FileAnalysis = {
    filePath,
    imports: [],
    proposedLocation,
    requiresReview: false,
    reviewNotes: []
  };

  // Analyze each import
  for (const imp of imports) {
    const location = await findFileLocation(imp);
    const suggestedFix = generateSuggestedImport(imp, location);
    
    analysis.imports.push({
      importPath: imp,
      fileLocation: location,
      suggestedFix
    });
  }

  // Determine if review is needed
  analysis.requiresReview = shouldRequireReview(analysis);
  analysis.reviewNotes = generateReviewNotes(analysis);

  return analysis;
}

function extractImports(content: string): string[] {
  const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

async function findFileLocation(importPath: string): Promise<FileLocation> {
  // Handle different import path formats
  const normalizedPath = importPath
    .replace(/^@\//, 'src/')  // Convert @/ imports
    .replace(/^\.\.?\//, ''); // Remove relative path markers

  // Try different possible locations
  const possiblePaths = [
    join('src', normalizedPath),
    join('src', normalizedPath + '.ts'),
    join('src', normalizedPath + '.tsx'),
    join('src', normalizedPath + '.js'),
    join('src', normalizedPath + '.jsx'),
    join('src', normalizedPath, 'index.ts'),
    join('src', normalizedPath, 'index.tsx'),
  ];

  for (const path of possiblePaths) {
    try {
      await access(path);
      const proposedPath = mapToNewStructure(path);
      return {
        currentPath: path,
        proposedPath,
        exists: true
      };
    } catch {
      continue;
    }
  }

  return {
    currentPath: null,
    proposedPath: '',
    exists: false
  };
}

function generateSuggestedImport(importPath: string, location: FileLocation): string {
  if (!location.exists) return importPath;
  // If already using @/ and matches, return as is
  if (importPath.startsWith('@/')) {
    const expected = location.proposedPath.replace(/^src\//, '').replace(/\\/g, '/');
    if (importPath === `@/${expected.replace(/\.(ts|tsx|js|jsx)$/, '')}`) {
      return importPath;
    }
    return `@/${expected.replace(/\.(ts|tsx|js|jsx)$/, '')}`;
  }
  // If relative and points to src, convert to @/
  if (importPath.startsWith('.')) {
    // Try to resolve to src-relative
    const rel = location.proposedPath.replace(/^src\//, '').replace(/\\/g, '/');
    return `@/${rel.replace(/\.(ts|tsx|js|jsx)$/, '')}`;
  }
  // Otherwise, return as is
  return importPath;
}

function shouldRequireReview(analysis: FileAnalysis): boolean {
  // Only require review if file needs to move or imports need fixing
  if (analysis.filePath.replace(/\\/g, '/') !== analysis.proposedLocation.replace(/\\/g, '/')) return true;
  if (analysis.imports.some(imp => imp.fileLocation.exists && imp.importPath !== imp.suggestedFix)) {
    return true;
  }
  return false;
}

function generateReviewNotes(analysis: FileAnalysis): string[] {
  const notes: string[] = [];
  if (analysis.filePath.replace(/\\/g, '/') !== analysis.proposedLocation.replace(/\\/g, '/')) {
    notes.push(`File needs to be moved from ${analysis.filePath} to ${analysis.proposedLocation}`);
  } else {
    notes.push('File is in the correct location.');
  }
  const importsToUpdate = analysis.imports.filter(
    imp => imp.fileLocation.exists && imp.importPath !== imp.suggestedFix
  );
  if (importsToUpdate.length > 0) {
    notes.push(`Has ${importsToUpdate.length} imports that need updating`);
  }
  const missingImports = analysis.imports.filter(imp => !imp.fileLocation.exists);
  if (missingImports.length > 0) {
    notes.push(`References ${missingImports.length} missing files`);
  }
  return notes;
}

async function generateMigrationPlan(): Promise<MigrationPlan> {
  const plan: MigrationPlan = {
    filesToMove: [],
    importFixes: [],
    missingFiles: [],
    summary: {
      totalFiles: 0,
      filesToMove: 0,
      importFixes: 0,
      missingFiles: 0
    }
  };

  // Find all TypeScript/JavaScript files
  const files = await glob('src/**/*.{ts,tsx,js,jsx}');
  plan.summary.totalFiles = files.length;

  // Analyze each file
  for (const file of files) {
    const analysis = await analyzeFile(file);
    
    if (analysis.requiresReview) {
      plan.filesToMove.push({
        from: file,
        to: analysis.proposedLocation,
        confidence: 0.8, // Placeholder confidence score
        reviewNotes: analysis.reviewNotes
      });
    }

    for (const imp of analysis.imports) {
      if (imp.fileLocation.exists) {
        plan.importFixes.push({
          file,
          currentImport: imp.importPath,
          suggestedImport: imp.suggestedFix,
          confidence: 0.9 // Placeholder confidence score
        });
      } else {
        plan.missingFiles.push({
          importPath: imp.importPath,
          referencedIn: [file]
        });
      }
    }
  }

  // Update summary
  plan.summary.filesToMove = plan.filesToMove.length;
  plan.summary.importFixes = plan.importFixes.length;
  plan.summary.missingFiles = plan.missingFiles.length;

  return plan;
}

async function generateMarkdownReport(plan: MigrationPlan): Promise<string> {
  let report = `# Migration Plan Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  // Summary Section
  report += `## Summary\n\n`;
  report += `- Total Files: ${plan.summary.totalFiles}\n`;
  report += `- Files to Move: ${plan.summary.filesToMove}\n`;
  report += `- Import Fixes: ${plan.summary.importFixes}\n`;
  report += `- Missing Files: ${plan.summary.missingFiles}\n\n`;

  // Files to Move Section
  report += `## Files to Move\n\n`;
  plan.filesToMove.forEach(f => {
    report += `### ${f.from}\n\n`;
    report += `**Proposed Location:** ${f.to}\n\n`;
    report += `**Confidence:** ${f.confidence}\n\n`;
    report += `**Review Notes:**\n`;
    f.reviewNotes.forEach(note => report += `- ${note}\n`);
    report += `\n---\n\n`;
  });

  // Import Fixes Section
  report += `## Import Fixes\n\n`;
  plan.importFixes.forEach(fix => {
    report += `### ${fix.file}\n\n`;
    report += `**Current Import:** \`${fix.currentImport}\`\n\n`;
    report += `**Suggested Import:** \`${fix.suggestedImport}\`\n\n`;
    report += `**Confidence:** ${fix.confidence}\n\n`;
    report += `---\n\n`;
  });

  // Missing Files Section
  report += `## Missing Files\n\n`;
  plan.missingFiles.forEach(missing => {
    report += `### ${missing.importPath}\n\n`;
    report += `**Referenced in:**\n`;
    missing.referencedIn.forEach(file => report += `- ${file}\n`);
    report += `\n---\n\n`;
  });

  return report;
}

async function main() {
  try {
    const plan = await generateMigrationPlan();
    const report = await generateMarkdownReport(plan);
    
    // Write to file
    await writeFile('docs/migration-plan.md', report);
    console.log('Migration plan has been written to docs/migration-plan.md');
  } catch (error) {
    console.error('Error generating migration plan:', error);
  }
}

main(); 