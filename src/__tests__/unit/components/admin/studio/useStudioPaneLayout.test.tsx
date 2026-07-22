import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/lib/preferences/studioWorkspaceLayout', () => {
  const actual = jest.requireActual('@/lib/preferences/studioWorkspaceLayout');
  return {
    ...actual,
    readStoredStudioWorkspaceLayoutPreferences: jest.fn(() => ({
      composeWidth: { px: 444, ratio: null, viewportWidth: null, updatedAt: null },
      questionsWidth: { px: 333, ratio: null, viewportWidth: null, updatedAt: null },
      paneVisibility: {
        organizationCollapsed: true,
        cardsCollapsed: false,
        composeCollapsed: false,
        questionsCollapsed: false,
        mediaCollapsed: true,
      },
    })),
    writeStoredStudioWorkspaceLayoutPreferences: jest.fn(),
  };
});

import { useStudioPaneLayout } from '@/components/admin/studio/useStudioPaneLayout';

const { writeStoredStudioWorkspaceLayoutPreferences: writePreferences } = jest.requireMock(
  '@/lib/preferences/studioWorkspaceLayout'
) as { writeStoredStudioWorkspaceLayoutPreferences: jest.Mock };

function Harness() {
  const layout = useStudioPaneLayout();
  return (
    <div>
      <output data-testid="compose">{layout.cardEditWidth}</output>
      <output data-testid="questions">{layout.questionsWidth}</output>
      <output data-testid="media">{String(layout.paneVisibility.mediaCollapsed)}</output>
      <output data-testid="wide">{String(layout.wideLayout)}</output>
      <button type="button" onClick={() => layout.togglePane('mediaCollapsed')}>Toggle media</button>
    </div>
  );
}

describe('useStudioPaneLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia = jest.fn(() => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('hydrates saved widths and visibility, owns responsive mode, and persists toggles', async () => {
    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('compose')).toHaveTextContent('444'));
    expect(screen.getByTestId('questions')).toHaveTextContent('333');
    expect(screen.getByTestId('media')).toHaveTextContent('true');
    expect(screen.getByTestId('wide')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle media' }));
    await waitFor(() => expect(screen.getByTestId('media')).toHaveTextContent('false'));
    expect(writePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({
        paneVisibility: expect.objectContaining({ mediaCollapsed: false }),
      })
    );
  });
});
