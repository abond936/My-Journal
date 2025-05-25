import { NextResponse } from 'next/server';
import { getAllJournalPages } from '@/lib/journal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const pages = await getAllJournalPages();
    const sections = new Map();

    // Extract unique sections based on h1 and h2 headings
    for (const page of pages) {
      for (const group of page.mainContent) {
        const heading = group.content.find(
          (item: any) =>
            item.type === 'heading' &&
            (item.metadata?.headingLevel === 1 || item.metadata?.headingLevel === 2)
        );
        if (heading && heading.metadata && typeof heading.metadata.headingLevel !== 'undefined') {
          if (!sections.has(heading.id)) {
            sections.set(heading.id, {
              id: heading.id,
              title: heading.content,
              level: heading.metadata.headingLevel,
              pageId: page.id,
            });
          }
        }
      }
    }

    const sectionsArray = Array.from(sections.values());
    return new NextResponse(
      JSON.stringify({ sections: sectionsArray }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error loading sections:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error loading sections' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 