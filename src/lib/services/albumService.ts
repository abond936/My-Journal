import { Album } from '@/lib/types/album';

// Mock data for development
const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'Family Vacation 2024',
    description: 'Photos from our summer vacation in the mountains',
    coverImage: '/placeholder.jpg',
    tags: ['who-1', 'what-1', 'when-1'],
    mediaCount: 45,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15'),
    status: 'published'
  },
  {
    id: '2',
    title: 'City Life',
    description: 'Urban photography collection',
    coverImage: '/placeholder.jpg',
    tags: ['where-1', 'reflection-1'],
    mediaCount: 30,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    status: 'draft'
  }
];

export async function getAllAlbums(): Promise<Album[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockAlbums];
}

export async function deleteAlbum(albumId: string): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = mockAlbums.findIndex(album => album.id === albumId);
  if (index !== -1) {
    mockAlbums.splice(index, 1);
  }
}

export async function updateAlbum(albumId: string, updates: Partial<Album>): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = mockAlbums.findIndex(album => album.id === albumId);
  if (index !== -1) {
    mockAlbums[index] = {
      ...mockAlbums[index],
      ...updates,
      updatedAt: new Date()
    };
  }
} 