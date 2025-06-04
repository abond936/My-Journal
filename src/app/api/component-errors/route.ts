import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ERROR_LOG_FILE = path.join(process.cwd(), 'component-errors.json');

export async function POST(request: Request) {
  try {
    const error = await request.json();
    
    // Read existing errors
    let errors = [];
    if (fs.existsSync(ERROR_LOG_FILE)) {
      const content = fs.readFileSync(ERROR_LOG_FILE, 'utf-8');
      errors = JSON.parse(content);
    }
    
    // Add new error
    errors.push({
      ...error,
      timestamp: new Date().toISOString()
    });
    
    // Write back to file
    fs.writeFileSync(ERROR_LOG_FILE, JSON.stringify(errors, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging component error:', error);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(ERROR_LOG_FILE)) {
      return NextResponse.json([]);
    }
    
    const content = fs.readFileSync(ERROR_LOG_FILE, 'utf-8');
    const errors = JSON.parse(content);
    
    // Clear old errors (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = errors.filter((error: any) => 
      new Date(error.timestamp) > oneHourAgo
    );
    
    // Write back filtered errors
    fs.writeFileSync(ERROR_LOG_FILE, JSON.stringify(recentErrors, null, 2));
    
    return NextResponse.json(recentErrors);
  } catch (error) {
    console.error('Error reading component errors:', error);
    return NextResponse.json({ error: 'Failed to read errors' }, { status: 500 });
  }
} 