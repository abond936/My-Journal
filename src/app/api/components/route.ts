import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface ComponentInfo {
  path: string;
  name: string;
  hasStyles: boolean;
  hasTests: boolean;
}

export async function GET() {
  const components: ComponentInfo[] = [];
  
  async function scanDirectory(dir: string, basePath: string = '') {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, relativePath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
        const componentPath = relativePath.replace(/\.(tsx|jsx)$/, '');
        const stylePath = fullPath.replace(/\.(tsx|jsx)$/, '.module.css');
        const testPath = fullPath.replace(/\.(tsx|jsx)$/, '.test.tsx');
        
        components.push({
          path: componentPath,
          name: entry.name.replace(/\.(tsx|jsx)$/, ''),
          hasStyles: existsSync(stylePath),
          hasTests: existsSync(testPath)
        });
      }
    }
  }
  
  await scanDirectory(join(process.cwd(), 'src/components'));
  
  return Response.json(components);
} 