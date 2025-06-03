import { Entry } from '@/lib/types/entry';

export const mockEntries: Entry[] = [
  {
    id: '1',
    title: 'First Day of Spring',
    content: 'The flowers are blooming and the birds are singing...',
    tags: ['spring', 'nature', 'reflection'],
    type: 'story',
    status: 'published',
    date: new Date('2024-03-20'),
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
    media: ['/placeholder.jpg'],
    visibility: 'private',
    inheritedTags: ['spring', 'nature', 'reflection']
  },
  {
    id: '2',
    title: 'Family Dinner',
    content: 'We gathered for a wonderful family dinner...',
    tags: ['family', 'food', 'togetherness'],
    type: 'story',
    status: 'published',
    date: new Date('2024-03-19'),
    createdAt: new Date('2024-03-19'),
    updatedAt: new Date('2024-03-19'),
    media: ['/placeholder.jpg'],
    visibility: 'private',
    inheritedTags: ['family', 'food', 'togetherness']
  },
  {
    id: '3',
    title: 'Morning Meditation',
    content: 'Started the day with a peaceful meditation session...',
    tags: ['wellness', 'morning', 'reflection'],
    type: 'story',
    status: 'published',
    date: new Date('2024-03-18'),
    createdAt: new Date('2024-03-18'),
    updatedAt: new Date('2024-03-18'),
    media: ['/placeholder.jpg'],
    visibility: 'private',
    inheritedTags: ['wellness', 'morning', 'reflection']
  }
]; 