import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/lib/utils/mediaReferenceSummaryClient', () => ({
  fetchAuthoritativeMediaReferenceSummaries: jest.fn(),
}));

import { useMediaBulkActions } from '@/components/admin/studio/media/useMediaBulkActions';
import { fetchAuthoritativeMediaReferenceSummaries } from '@/lib/utils/mediaReferenceSummaryClient';

const fetchSummaries = fetchAuthoritativeMediaReferenceSummaries as jest.Mock;
const deleteMultipleMedia = jest.fn();
const reloadSelectedCard = jest.fn();
const feedback = { showError: jest.fn() };

function Harness() {
  const actions = useMediaBulkActions({
    selectedMediaIds: ['m1', 'm2'],
    deleteMultipleMedia,
    selectedCardId: 'card-1',
    reloadSelectedCard,
    feedback,
  });
  return <>
    <output data-testid="open">{String(actions.bulkDeleteModalOpen)}</output>
    <output data-testid="linked">{actions.bulkDeleteConsequences.linkedMediaCount}/{actions.bulkDeleteConsequences.linkedCardCount}</output>
    <button onClick={() => void actions.openBulkDelete()}>Open</button>
    <button onClick={() => void actions.confirmBulkDelete()}>Delete</button>
  </>;
}

describe('useMediaBulkActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('verifies consequences before opening and refreshes the active card after deletion', async () => {
    fetchSummaries.mockResolvedValue({ m1: ['c1', 'c2'], m2: ['c2'] });
    deleteMultipleMedia.mockResolvedValue(undefined);
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByTestId('open')).toHaveTextContent('true'));
    expect(screen.getByTestId('linked')).toHaveTextContent('2/2');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Delete' })));
    expect(deleteMultipleMedia).toHaveBeenCalledWith(['m1', 'm2']);
    expect(reloadSelectedCard).toHaveBeenCalledWith('card-1');
  });
});
