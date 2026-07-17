/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InlineGallery from '@/components/view/InlineGallery';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';

const showError = jest.fn();
const patchReaderGalleryCaption = jest.fn();

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({ showError }),
}));

jest.mock('@/lib/utils/readerCardPatchReconcile', () => ({
  patchReaderGalleryCaption: (...args: unknown[]) => patchReaderGalleryCaption(...args),
}));

jest.mock('swiper/css', () => ({}));
jest.mock('swiper/css/navigation', () => ({}));
jest.mock('swiper/css/zoom', () => ({}));

jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: {},
  Zoom: {},
  Keyboard: {},
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

describe('InlineGallery focal contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the gallery-slot focal override for cropped reader gallery images', () => {
    render(
      <InlineGallery
        media={[
          {
            mediaId: 'media-1',
            order: 0,
            objectPosition: '22% 78%',
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
              caption: 'Portrait memory',
              createdAt: 0,
              updatedAt: 0,
            },
          } as HydratedGalleryMediaItem,
        ]}
      />
    );

    const image = screen.getByAltText('Portrait memory');
    expect(image).toHaveStyle({ objectFit: 'cover', objectPosition: '22% 78%' });
  });

  it('falls back to the Studio Media focal point when no gallery override exists', () => {
    render(
      <InlineGallery
        media={[
          {
            mediaId: 'media-2',
            order: 0,
            media: {
              docId: 'media-2',
              filename: 'landscape.jpg',
              width: 1600,
              height: 900,
              size: 1024,
              contentType: 'image/jpeg',
              storageUrl: 'https://example.com/landscape.jpg',
              storagePath: 'images/landscape.jpg',
              source: 'upload',
              sourcePath: 'upload://landscape.jpg',
              objectPosition: '61% 44%',
              caption: 'Landscape memory',
              createdAt: 0,
              updatedAt: 0,
            },
          } as HydratedGalleryMediaItem,
        ]}
      />
    );

    const image = screen.getByAltText('Landscape memory');
    expect(image).toHaveStyle({ objectFit: 'cover', objectPosition: '61% 44%' });
  });

  it('keeps a failed caption draft visible for retry when closing the lightbox', async () => {
    patchReaderGalleryCaption.mockRejectedValueOnce(new Error('Save unavailable.'));
    const media = [
      {
        mediaId: 'media-3',
        order: 0,
        media: {
          docId: 'media-3',
          filename: 'memory.jpg',
          caption: 'Original caption',
        },
      } as HydratedGalleryMediaItem,
    ];

    render(
      <InlineGallery
        media={media}
        editableCaptions
        cardId="card-1"
        onGallerySaved={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open image 1 fullscreen' }));
    const caption = screen.getByRole('textbox', { name: 'Gallery image caption' });
    fireEvent.change(caption, { target: { value: 'Unsaved revised caption' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close image viewer' }));

    await waitFor(() => expect(showError).toHaveBeenCalled());
    expect(screen.getByRole('dialog', { name: 'Image viewer' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Gallery image caption' })).toHaveValue(
      'Unsaved revised caption'
    );
  });
});
