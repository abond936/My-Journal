import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Card } from '@/lib/types/card';
import { useStudioSelectedCard } from '@/components/admin/studio/useStudioSelectedCard';

const reconcile = jest.fn();
const upsert = jest.fn();
const setBusy = jest.fn();
const setError = jest.fn();
const setInfo = jest.fn();

function apiResponse(card: Partial<Card>) {
  return {
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(JSON.stringify(card)),
    json: jest.fn().mockResolvedValue(card),
  } as unknown as Response;
}

function Harness() {
  const selected = useStudioSelectedCard({
    initialCardId: null,
    selectionRequestKey: '__none__',
    reconcileCardMediaAssignments: reconcile,
    onCardUpsert: upsert,
    setActionBusy: setBusy,
    setActionError: setError,
    setActionInfo: setInfo,
  });
  return (
    <div>
      <output data-testid="id">{selected.selectedCardId ?? 'none'}</output>
      <output data-testid="title">{selected.selectedDetail?.title ?? 'none'}</output>
      <output data-testid="status">{selected.activeCardViewModel.status}</output>
      <button type="button" onClick={() => selected.selectCard('card-1', { docId: 'card-1', title: 'Preview' } as Card)}>Select</button>
      <button type="button" onClick={() => void selected.patchSelectedCard({ title: 'Patched' }, 'Saved')}>Patch</button>
      <button type="button" onClick={() => selected.evictCard('card-1')}>Evict</button>
    </div>
  );
}

describe('useStudioSelectedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(apiResponse({ docId: 'card-1', title: 'Loaded', galleryMedia: [], contentMedia: [] }))
      .mockResolvedValueOnce(apiResponse({ docId: 'card-1', title: 'Patched', galleryMedia: [], contentMedia: [] }));
  });

  it('loads selected detail, commits an optimistic patch, and evicts selection through one controller', async () => {
    render(<Harness />);
    expect(screen.getByTestId('status')).toHaveTextContent('empty');

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('Loaded'));
    expect(global.fetch).toHaveBeenCalledWith('/api/cards/card-1?children=skip', expect.any(Object));
    expect(screen.getByTestId('status')).toHaveTextContent('hydrated');

    fireEvent.click(screen.getByRole('button', { name: 'Patch' }));
    await waitFor(() => expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Patched' })));
    expect(setInfo).toHaveBeenCalledWith('Saved');
    expect(reconcile).toHaveBeenCalledWith('card-1', [], []);

    fireEvent.click(screen.getByRole('button', { name: 'Evict' }));
    await waitFor(() => expect(screen.getByTestId('id')).toHaveTextContent('none'));
  });
});
