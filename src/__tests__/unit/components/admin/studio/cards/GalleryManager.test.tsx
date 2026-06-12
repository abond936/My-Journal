/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleryManager from '@/components/admin/studio/cards/GalleryManager';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  rectSortingStrategy: jest.fn(),
  arrayMove: (items: unknown[]) => items,
}));

jest.mock('@/components/admin/studio/cards/SortableItem', () => ({
  SortableItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/admin/studio/cards/PhotoPicker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

jest.mock('@/lib/hooks/useDefaultDndSensors', () => ({
  useDefaultDndSensors: () => [],
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({
    alt,
    style,
    className,
  }: {
    alt: string;
    style?: React.CSSProperties;
    className?: string;
  }) => <img alt={alt} style={style} className={className} />,
}));

describe('GalleryManager modal contract', () => {
  const galleryItem = {
    mediaId: 'media-1',
    order: 0,
    media: {
      docId: 'media-1',
      filename: 'portrait.jpg',
      width: 900,
      height: 1600,
      size: 1024,
      contentType: 'image/jpeg',
      storageUrl: 'https://example.com/portrait.jpg',
      storagePath: 'images/portrait.jpg',
      source: 'upload',
      sourcePath: 'upload://portrait.jpg',
      objectPosition: '40% 35%',
      createdAt: 0,
      updatedAt: 0,
    },
  } as HydratedGalleryMediaItem;

  it('treats the modal as a crop-override surface, not a caption editor', async () => {
    render(
      <GalleryManager
        galleryMedia={[galleryItem]}
        onUpdate={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Edit image metadata' }));

    expect(screen.getByText('Gallery crop override')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use media default crop' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Optional caption for this slot on the card')).not.toBeInTheDocument();
  });

  it('persists gallery removal immediately when the shared gallery patch hook is provided', async () => {
    const onUpdate = jest.fn();
    const onPersistGalleryAfterSlotSave = jest.fn(async () => true);

    render(
      <GalleryManager
        galleryMedia={[galleryItem]}
        onUpdate={onUpdate}
        onPersistGalleryAfterSlotSave={onPersistGalleryAfterSlotSave}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }));

    expect(onUpdate).toHaveBeenCalledWith([]);
    expect(onPersistGalleryAfterSlotSave).toHaveBeenCalledWith([]);
  });
});
