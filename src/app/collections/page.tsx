import { Card } from '@/lib/types/card';
import CollectionsListClientPage from './CollectionsListClientPage';

export const dynamic = 'force-dynamic';

async function getTopLevelCollections(): Promise<Card[]> {
  const collectionIds = [
    'dPdhXfdC0hXHGTlxSabr', // My Father
    'wJJ1ffglxXZUEEFczwu3', // The World in 1959
  ];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Fetch each card individually
    const promises = collectionIds.map(id => 
      fetch(`${baseUrl}/api/collections/${id}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${id}`);
          return res.json();
        })
    );
    
    const collections = await Promise.all(promises);
    return collections;
  } catch (error) {
    console.error('Error fetching top-level collections:', error);
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = await getTopLevelCollections();

  return <CollectionsListClientPage collections={collections} />;
} 