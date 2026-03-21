export interface PaginatedResult<T> {
  items: T[];
  /** Cursor id for pagination (matches cardService responses) */
  lastDocId?: string;
  /** Legacy Firestore snapshot cursor; prefer lastDocId */
  lastDoc?: unknown;
  hasMore: boolean;
} 