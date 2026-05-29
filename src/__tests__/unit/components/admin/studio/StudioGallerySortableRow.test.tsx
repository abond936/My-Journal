import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioGallerySortableRow } from '@/components/admin/studio/studioRelationshipDndPrimitives';

const mockUseDndContext = jest.fn();
const mockUseSortable = jest.fn();

jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  useDndContext: () => mockUseDndContext(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  ...jest.requireActual('@dnd-kit/sortable'),
  useSortable: () => mockUseSortable(),
}));

describe('StudioGallerySortableRow', () => {
  beforeEach(() => {
    mockUseDndContext.mockReset();
    mockUseSortable.mockReset();
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      setActivatorNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });
  });

  it('shows an insert-before marker when a later gallery item is dragged over this row', () => {
    mockUseDndContext.mockReturnValue({
      active: { id: 'gallery:media-3:2' },
      over: { id: 'gallery:media-1:0' },
    });

    render(
      <StudioGallerySortableRow id="gallery:media-1:0" galleryFocusMediaId="media-1">
        <div>Gallery item</div>
      </StudioGallerySortableRow>
    );

    const row = screen.getByRole('button', { name: /Drag to reorder gallery item/i }).parentElement;
    expect(row).toHaveClass('gallerySortableRowInsertBefore');
    expect(row).not.toHaveClass('gallerySortableRowInsertAfter');
  });

  it('shows an insert-after marker when an earlier gallery item is dragged over this row', () => {
    mockUseDndContext.mockReturnValue({
      active: { id: 'gallery:media-1:0' },
      over: { id: 'gallery:media-3:2' },
    });

    render(
      <StudioGallerySortableRow id="gallery:media-3:2" galleryFocusMediaId="media-3">
        <div>Gallery item</div>
      </StudioGallerySortableRow>
    );

    const row = screen.getByRole('button', { name: /Drag to reorder gallery item/i }).parentElement;
    expect(row).toHaveClass('gallerySortableRowInsertAfter');
    expect(row).not.toHaveClass('gallerySortableRowInsertBefore');
  });
});
