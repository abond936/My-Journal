import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMediaStackActions } from '@/components/admin/studio/media/useMediaStackActions';

const media = [
  { docId: 'm1' },
  { docId: 'm2' },
] as Parameters<typeof useMediaStackActions>[0]['media'];
const createStack = jest.fn();
const dissolveStack = jest.fn();
const refreshMedia = jest.fn();
const setSelectedMediaIds = jest.fn();
const feedback = { showError: jest.fn(), showSuccess: jest.fn() };

function Harness() {
  const actions = useMediaStackActions({
    media,
    selectedMediaIds: ['m1', 'm2'],
    setSelectedMediaIds,
    stackById: new Map(),
    showAllStacks: false,
    createStack,
    dissolveStack,
    refreshMedia,
    feedback,
  });
  return <>
    <output data-testid="eligible">{String(actions.createStackEligible)}</output>
    <output data-testid="expanded">{String(actions.stackGridProps.expandedStackIds.has('s1'))}</output>
    <button onClick={() => void actions.createFromSelection()}>Create</button>
    <button onClick={() => actions.stackGridProps.onToggleStackExpand('s1')}>Expand</button>
  </>;
}

describe('useMediaStackActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('owns eligibility, expansion, creation, refresh, and selection cleanup', async () => {
    createStack.mockResolvedValue(undefined);
    refreshMedia.mockResolvedValue(undefined);
    render(<Harness />);

    expect(screen.getByTestId('eligible')).toHaveTextContent('true');
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(screen.getByTestId('expanded')).toHaveTextContent('true');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Create' })));
    await waitFor(() => expect(createStack).toHaveBeenCalledWith(['m1', 'm2']));
    expect(refreshMedia).toHaveBeenCalled();
    expect(setSelectedMediaIds).toHaveBeenCalledWith([]);
  });
});
