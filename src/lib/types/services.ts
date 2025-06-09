import { DocumentSnapshot } from 'firebase-admin/firestore';

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
} 