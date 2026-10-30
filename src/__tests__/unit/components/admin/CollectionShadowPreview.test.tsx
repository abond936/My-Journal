import { render, screen } from '@testing-library/react';
import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import CollectionShadowPreview from '@/components/admin/collections/CollectionShadowPreview';
import { buildReaderCollectionProjection } from '@/lib/utils/collectionPlacementProjection';

function card(docId: string, title: string, status: Card['status'] = 'draft'): Card {
  return { docId, title, status } as Card;
}

describe('CollectionShadowPreview', () => {
  it('labels shadow state, roles, introduction, and reused Card occurrences without edit controls', () => {
    const collection = {
      docId: 'my-life',
      title: 'My Life',
      introductionCardId: 'welcome',
      lifecycle: 'draft',
      recordState: 'shadow',
      order: 10,
      createdAt: 1,
      updatedAt: 1,
    } as Collection;
    const placements = [
      { docId: 'chapter-a', collectionId: 'my-life', cardId: 'a', role: 'chapter', order: 10 },
      { docId: 'shared-a', collectionId: 'my-life', cardId: 'shared', parentPlacementId: 'chapter-a', role: 'card', order: 10 },
      { docId: 'chapter-b', collectionId: 'my-life', cardId: 'b', role: 'chapter', order: 20 },
      { docId: 'shared-b', collectionId: 'my-life', cardId: 'shared', parentPlacementId: 'chapter-b', role: 'card', order: 10 },
    ].map((placement) => ({ createdAt: 1, updatedAt: 1, ...placement } as CollectionPlacement));
    const projection = buildReaderCollectionProjection({
      collection,
      placements,
      cards: [card('welcome', 'WELCOME'), card('a', 'First'), card('b', 'Second'), card('shared', 'Shared story', 'published')],
    });
    render(<CollectionShadowPreview projection={projection} readiness={{
      ready: true,
      currentSourceFingerprint: 'a'.repeat(64),
      currentTargetFingerprint: 'b'.repeat(64),
      sourceFingerprintMatches: true,
      targetFingerprintMatches: true,
      parityIssues: [],
      sourceIssueCount: 0,
    }} />);
    expect(screen.getByRole('heading', { name: 'My Life' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'WELCOME' })).toBeInTheDocument();
    expect(screen.getAllByText('Reused Card')).toHaveLength(2);
    expect(screen.getByText('Reused Cards').previousElementSibling).toHaveTextContent('1');
    expect(screen.getAllByText('Chapter')).toHaveLength(2);
    expect(screen.getByText('shadow')).toBeInTheDocument();
    expect(screen.getByText('Parity current')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
