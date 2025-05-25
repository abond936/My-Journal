import { NextResponse } from 'next/server';
import { getAllJournalPages, getJournalPage, updateContentGroup } from '@/lib/journal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  try {
    // Find the section content from all pages
    const pages = await getAllJournalPages();
    let sectionContent = '';
    let found = false;

    for (const page of pages) {
      for (const group of page.mainContent) {
        const heading = group.content.find(
          (item: any) => item.type === 'heading' && item.id === params.sectionId
        );
        if (heading) {
          found = true;
          // Get all text content from this group
          const textContent = group.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.content);
          sectionContent = textContent.join('\n\n');
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return new NextResponse(
        JSON.stringify({ error: 'Section not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new NextResponse(
      JSON.stringify({ content: sectionContent }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error loading content:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error loading content' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  try {
    const body = await request.json();
    const pages = await getAllJournalPages();
    let updated = false;
    let updatedGroup = null;
    let pageId = '';

    // Find the group to update
    for (const page of pages) {
      for (const group of page.mainContent) {
        const heading = group.content.find(
          (item: any) => item.type === 'heading' && item.id === params.sectionId
        );
        if (heading) {
          // Update all text content in this group
          group.content.forEach((item: any) => {
            if (item.type === 'text') {
              item.content = body.content;
              updated = true;
            }
          });
          updatedGroup = group;
          pageId = page.id;
          break;
        }
      }
      if (updated) break;
    }

    if (!updated || !updatedGroup || !pageId) {
      return new NextResponse(
        JSON.stringify({ error: 'Section not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Update the content group in Firestore
    await updateContentGroup(pageId, updatedGroup);

    return new NextResponse(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error saving content:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error saving content' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 