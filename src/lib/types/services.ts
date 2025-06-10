import { DocumentSnapshot } from 'firebase-admin/firestore';

export interface PaginatedResult<T> {
  items: T[];
  lastDoc?: any;
  hasMore: boolean;
} 