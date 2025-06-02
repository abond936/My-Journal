import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const ERROR_LOG_FILE = join(process.cwd(), 'component-errors.json');

export async function POST(request: Request) {
  try {
    const error = await request.json();
    const timestamp = new Date().toISOString();
    
    // Read existing errors
    let errors = [];
    try {
      const content = await readFile(ERROR_LOG_FILE, 'utf-8');
      errors = JSON.parse(content);
    } catch (e) {
      // File doesn't exist or is invalid, start fresh
    }
    
    // Add new error with timestamp
    errors.push({
      ...error,
      timestamp
    });
    
    // Write back to file
    await writeFile(ERROR_LOG_FILE, JSON.stringify(errors, null, 2));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to log error:', error);
    return Response.json({ success: false, error: 'Failed to log error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const content = await readFile(ERROR_LOG_FILE, 'utf-8');
    const errors = JSON.parse(content);
    return Response.json(errors);
  } catch (e) {
    return Response.json([]);
  }
} 