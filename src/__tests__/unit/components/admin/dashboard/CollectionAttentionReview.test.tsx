import { render, screen } from '@testing-library/react';
import CollectionAttentionReview from '@/components/admin/dashboard/CollectionAttentionReview';

describe('CollectionAttentionReview', () => {
  it('exposes exact Card, Media, and broken-reference work without offering automatic repair', () => {
    render(<CollectionAttentionReview details={{
      summary: {
        collectionId: 'my-life', title: 'My Life', lifecycle: 'draft', requiredCards: 2,
        missingRequiredCards: 0, draftCards: 1, cardsNeedingDimensionReview: 1,
        cardsMissingMeaningfulWhat: 1, referencedMedia: 2, missingMedia: 1,
        mediaNeedingDimensionReview: 1,
        mediaReadiness: { ready: 0, pending: 0, failed: 1, unassessed: 0 },
        audienceSelectionState: 'legacy_all_enabled',
      },
      missingRequiredCardIds: [],
      draftCards: [{ cardId: 'card-1', title: 'Beach day', incompleteDimensions: [] }],
      cardsNeedingDimensionReview: [{
        cardId: 'card-1', title: 'Beach day', incompleteDimensions: ['what'],
      }],
      cardsMissingMeaningfulWhat: [{
        cardId: 'card-1', title: 'Beach day', incompleteDimensions: ['what'],
      }],
      missingMedia: [{
        mediaId: 'missing-1',
        referencedByCards: [{ cardId: 'card-1', title: 'Beach day' }],
      }],
      mediaNeedingDimensionReview: [{
        mediaId: 'media-1', label: 'At the beach', incompleteDimensions: ['where'],
        readiness: 'unassessed',
        referencedByCards: [{ cardId: 'card-1', title: 'Beach day' }],
      }],
      mediaReadinessAttention: [{
        mediaId: 'media-1', label: 'At the beach', incompleteDimensions: ['where'],
        readiness: 'failed',
        referencedByCards: [{ cardId: 'card-1', title: 'Beach day' }],
      }],
    }} />);

    expect(screen.getByRole('heading', { name: 'My Life: Needs attention' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Beach day' })[0]).toHaveAttribute(
      'href', '/admin/studio?card=card-1'
    );
    expect(screen.getAllByRole('link', { name: 'At the beach' })[0]).toHaveAttribute(
      'href', '/admin/studio?destination=media&mediaReview=media-1'
    );
    expect(screen.getAllByRole('link', { name: 'At the beach' })[1]).toHaveAttribute(
      'href', '/admin/studio?destination=media&media=media-1'
    );
    expect(screen.getByText('missing-1')).toBeInTheDocument();
    expect(screen.getByText(/nothing is repaired, approved, or published automatically/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /repair|approve|publish/i })).not.toBeInTheDocument();
  });
});
