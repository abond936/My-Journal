import React from 'react';
import { render } from '@testing-library/react';
import StudioCardFormShellSync from '@/components/admin/studio/StudioCardFormShellSync';

const applyShellRelationshipSync = jest.fn();

jest.mock('@/components/providers/CardFormProvider', () => ({
  useCardForm: () => ({
    formState: {
      cardData: {
        docId: 'card-1',
      },
    },
    applyShellRelationshipSync,
  }),
}));

const useStudioShellMock = jest.fn();

jest.mock('@/components/admin/studio/StudioShellContext', () => ({
  useStudioShell: () => useStudioShellMock(),
}));

describe('StudioCardFormShellSync', () => {
  beforeEach(() => {
    applyShellRelationshipSync.mockReset();
    useStudioShellMock.mockReset();
  });

  it('does not resync when only updatedAt changes on the same selected card', () => {
    useStudioShellMock.mockReturnValue({
      selectedCardId: 'card-1',
      selectedDetail: {
        docId: 'card-1',
        updatedAt: 100,
        coverImageId: null,
        coverImage: null,
        galleryMedia: [],
        childrenIds: [],
        contentMedia: [],
        type: 'story',
        status: 'draft',
        questionId: null,
      },
    });

    const view = render(<StudioCardFormShellSync />);
    expect(applyShellRelationshipSync).toHaveBeenCalledTimes(1);

    useStudioShellMock.mockReturnValue({
      selectedCardId: 'card-1',
      selectedDetail: {
        docId: 'card-1',
        updatedAt: 200,
        coverImageId: null,
        coverImage: null,
        galleryMedia: [],
        childrenIds: [],
        contentMedia: [],
        type: 'story',
        status: 'draft',
        questionId: null,
      },
    });

    view.rerender(<StudioCardFormShellSync />);
    expect(applyShellRelationshipSync).toHaveBeenCalledTimes(1);
  });
});
