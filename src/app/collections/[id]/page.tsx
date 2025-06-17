import { Card } from '@/lib/types/card';
import CollectionClientPage from './CollectionClientPage';

interface CollectionPageProps {
  params: {
    id: string;
  };
}

// Re-export for Next.js to recognize the dynamic nature of the page
export const dynamic = 'force-dynamic';

async function getCollectionData(id: string): Promise<(Card & { children: Card[] }) | null> {
  try {
    // This needs to be an absolute URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/collections/${id}`, {
      cache: 'no-store', // Ensure fresh data for the demo
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching collection data:', error);
    return null;
  }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const collectionData = await getCollectionData(params.id);

  if (!collectionData) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Error</h2>
        <p>Could not load collection data for ID: {params.id}</p>
      </div>
    );
  }

  return <CollectionClientPage collectionData={collectionData} />;
} 