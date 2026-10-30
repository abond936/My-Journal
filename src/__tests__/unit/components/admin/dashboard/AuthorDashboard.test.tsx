import { render, screen } from '@testing-library/react';
import AuthorDashboard from '@/components/admin/dashboard/AuthorDashboard';
import type { AuthorDashboardSummary } from '@/lib/services/authorDashboardService';

jest.mock('@/components/admin/dashboard/DashboardCardStatusLink', () => function DashboardCardStatusLinkMock({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
});

const baseSummary: AuthorDashboardSummary = {
  generatedAt: 1,
  cards: { status: 'ready', data: { total: 10, draft: 4, published: 6 } },
  media: {
    status: 'ready',
    data: {
      total: 20,
      unreviewed: { who: 2, what: 3, when: 4, where: 5 },
      failedReadiness: 1,
    },
  },
  operations: { status: 'ready', data: { attention: 0, active: 0, failed: 0 } },
  collections: {
    status: 'ready',
    data: {
      total: 1,
      items: [{
        collectionId: 'my-life',
        title: 'My Life',
        lifecycle: 'draft',
        requiredCards: 196,
        missingRequiredCards: 0,
        draftCards: 87,
        cardsNeedingDimensionReview: 196,
        cardsMissingMeaningfulWhat: 196,
        referencedMedia: 295,
        missingMedia: 17,
        mediaNeedingDimensionReview: 201,
        mediaReadiness: { ready: 0, pending: 2, failed: 1, unassessed: 275 },
        audienceSelectionAvailable: false,
      }],
    },
  },
};

describe('AuthorDashboard', () => {
  it('presents Collection publication work as attention without blocking drafts', () => {
    render(<AuthorDashboard summary={baseSummary} />);

    expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
    expect(screen.getByText(/Draft work can continue/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Life' })).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('278')).toBeInTheDocument();
    expect(screen.getByText('Not yet available')).toBeInTheDocument();
  });

  it('degrades Collection attention independently', () => {
    render(<AuthorDashboard summary={{ ...baseSummary, collections: { status: 'unavailable' } }} />);

    expect(screen.getByText('Collection attention is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
