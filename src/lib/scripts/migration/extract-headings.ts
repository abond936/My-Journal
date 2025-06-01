import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

interface Heading {
  level: number;
  text: string;
  children: Heading[];
}

function extractHeadings(html: string): Heading[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const headings: Heading[] = [];
  const stack: Heading[] = [];

  // Get all headings
  const headingElements = document.querySelectorAll('h1, h2, h3, h4');
  
  headingElements.forEach((element) => {
    const level = parseInt(element.tagName[1]);
    const text = element.textContent?.trim() || '';
    
    const heading: Heading = {
      level,
      text,
      children: []
    };

    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      headings.push(heading);
    } else {
      stack[stack.length - 1].children.push(heading);
    }

    stack.push(heading);
  });

  return headings;
}

function formatHeadings(headings: Heading[], indent = ''): string {
  let output = '';
  
  headings.forEach(heading => {
    output += `${indent}${'#'.repeat(heading.level)} ${heading.text}\n`;
    if (heading.children.length > 0) {
      output += formatHeadings(heading.children, indent + '  ');
    }
  });

  return output;
}

// Main execution
const htmlPath = path.join(process.cwd(), 'temp', 'My Jounral - Website.htm');
const outputPath = path.join(process.cwd(), 'temp', 'headings-hierarchy.txt');

try {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const headings = extractHeadings(html);
  const formattedOutput = formatHeadings(headings);
  
  fs.writeFileSync(outputPath, formattedOutput);
  console.log('Headings hierarchy has been extracted to:', outputPath);
} catch (error) {
  console.error('Error processing file:', error);
} 