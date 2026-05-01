import type { Card } from '@/lib/types/card';

/** Context passed to `embeddedUnparentedReplacement` (Studio card bank). */
export type EmbeddedUnparentedBankContext = {
  refreshCards: () => void;
  collectionCards: Card[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: 'all' | 'draft' | 'published';
  setStatusFilter: (v: 'all' | 'draft' | 'published') => void;
  selectedCardId: string | null;
  onSelectCard: (cardId: string, previewCard?: Card | null) => void;
  saving: boolean;
  curatedTreeDnd: boolean;
  treeDropZonesReadOnly: boolean;
};
