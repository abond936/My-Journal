import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DiscoverySection from '@/components/view/DiscoverySection';
import type { Card } from '@/lib/types/card';

const feedCardTypes = new Set<Card['type']>(['story', 'gallery', 'qa', 'quote', 'callout']);

jest.mock('@/components/providers/CardProvider', () => ({
  FEED_CARD_TYPES_ORDER: ['story', 'gallery', 'qa', 'quote', 'callout'],
  useCardContext: () => ({ feedCardTypes, isFeedCardTypesFilterActive: false }),
}));

jest.mock('@/components/view/V2ContentCard', () => ({
  __esModule: true,
  default: ({ card, destinationReaderMode }: { card: Card; destinationReaderMode?: string }) => (
    <div data-testid={`discovery-${card.docId}`} data-reader-mode={destinationReaderMode}>{card.title}</div>
  ),
}));

jest.mock('@/components/common/LoadingSpinner', () => ({
  __esModule: true,
  default: () => <span>Loading</span>,
}));

function card(overrides: Partial<Card> = {}): Card {
  return {
    docId: 'current',
    title: 'Current card',
    type: 'story',
    status: 'published',
    displayMode: 'navigate',
    ...overrides,
  } as Card;
}

function response(items: Card[]): Response {
  return { ok: true, json: async () => items } as Response;
}

describe('DiscoverySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('omits the Related request and rail when the current card has no dimensional tags', async () => {
    const fetchMock = jest.fn().mockResolvedValue(response([card({ docId: 'broad-1', title: 'Broad result' })]));
    global.fetch = fetchMock;

    render(<DiscoverySection currentCard={card()} childrenCards={[]} readerMode="freeform" />);

    expect(await screen.findByText('Broad result')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('excludeDimensionalMatches=true');
    expect(screen.queryByRole('heading', { name: 'Related' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unrelated' })).toBeInTheDocument();
    expect(screen.getByTestId('discovery-broad-1')).toHaveAttribute('data-reader-mode', 'freeform');
  });

  it('deduplicates generated Related and Unrelated rails defensively', async () => {
    const duplicate = card({ docId: 'shared-1', title: 'Shared result' });
    const unrelated = card({ docId: 'broad-2', title: 'Unrelated result' });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response([duplicate]))
      .mockResolvedValueOnce(response([duplicate, unrelated]));
    global.fetch = fetchMock;

    render(
      <DiscoverySection
        currentCard={card({ who: ['who-1'] })}
        childrenCards={[]}
      />
    );

    await waitFor(() => expect(screen.getByText('Unrelated result')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('Shared result')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Related' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unrelated' })).toBeInTheDocument();
  });
});
