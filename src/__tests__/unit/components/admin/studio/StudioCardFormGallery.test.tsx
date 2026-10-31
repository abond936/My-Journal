/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudioCardFormGallery from '@/components/admin/studio/StudioCardFormGallery';
import type { HydratedGalleryMediaItem } from '@/lib/types/card';

const mockSetField = jest.fn();
const mockRegisterCreatedMedia = jest.fn();
const mockOpenDevicePicker = jest.fn();
const mockUploadImageFileToMediaBank = jest.fn();
let dropzoneOptions: { onDrop?: (files: File[]) => void; multiple?: boolean } = {};

jest.mock('@/components/providers/CardFormProvider', () => ({
  useCardForm: () => ({
    formState: {
      cardData: {
        galleryMedia: [
          {
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
          } satisfies HydratedGalleryMediaItem,
        ],
      },
    },
    setField: mockSetField,
  }),
}));

jest.mock('@/components/providers/MediaProvider', () => ({
  useMedia: () => ({ registerCreatedMedia: mockRegisterCreatedMedia }),
}));

jest.mock('@/lib/utils/uploadImageFileToMediaBank', () => ({
  uploadImageFileToMediaBank: (...args: unknown[]) => mockUploadImageFileToMediaBank(...args),
}));

jest.mock('@/components/admin/studio/cards/PhotoPicker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-dropzone', () => ({
  useDropzone: (options: typeof dropzoneOptions) => {
    dropzoneOptions = options;
    return {
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
      open: mockOpenDevicePicker,
    };
  },
}));

jest.mock('@/components/admin/studio/studioRelationshipDndPrimitives', () => ({
  StudioDropZone: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StudioGalleryEndDropZone: () => null,
  StudioGallerySortableRow: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  rectSortingStrategy: jest.fn(),
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

describe('StudioCardFormGallery modal contract', () => {
  beforeEach(() => {
    mockSetField.mockClear();
    mockRegisterCreatedMedia.mockClear();
    mockOpenDevicePicker.mockClear();
    mockUploadImageFileToMediaBank.mockReset();
    dropzoneOptions = {};
  });

  it('shows Add from library for gallery assignment', () => {
    render(
      <StudioCardFormGallery
        disabled={false}
        onSetAsCover={jest.fn()}
        currentCoverMediaId={null}
      />
    );

    expect(screen.getByRole('button', { name: 'Add from library' })).toBeInTheDocument();
  });

  it('opens a multi-select device photo picker', async () => {
    render(
      <StudioCardFormGallery
        disabled={false}
        onSetAsCover={jest.fn()}
        currentCoverMediaId={null}
      />
    );

    expect(dropzoneOptions.multiple).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Add from device' }));
    expect(mockOpenDevicePicker).toHaveBeenCalledTimes(1);
  });

  it('imports every selected device photo and appends the successful media in order', async () => {
    mockUploadImageFileToMediaBank
      .mockResolvedValueOnce({ docId: 'media-2', filename: 'first.jpg' })
      .mockResolvedValueOnce({ docId: 'media-3', filename: 'second.jpg' });

    render(
      <StudioCardFormGallery
        disabled={false}
        onSetAsCover={jest.fn()}
        currentCoverMediaId={null}
      />
    );

    const files = [
      new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
    ];
    act(() => dropzoneOptions.onDrop?.(files));

    await waitFor(() => expect(mockUploadImageFileToMediaBank).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(mockSetField).toHaveBeenCalledWith(
        'galleryMedia',
        expect.arrayContaining([
          expect.objectContaining({ mediaId: 'media-2', order: 1 }),
          expect.objectContaining({ mediaId: 'media-3', order: 2 }),
        ])
      )
    );
    expect(mockRegisterCreatedMedia).toHaveBeenCalledTimes(2);
  });

  it('keeps successful device imports when another selected photo fails', async () => {
    mockUploadImageFileToMediaBank
      .mockResolvedValueOnce({ docId: 'media-2', filename: 'first.jpg' })
      .mockRejectedValueOnce(new Error('Upload failed'));

    render(
      <StudioCardFormGallery
        disabled={false}
        onSetAsCover={jest.fn()}
        currentCoverMediaId={null}
      />
    );

    act(() =>
      dropzoneOptions.onDrop?.([
        new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
        new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
      ])
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '1 photo could not be added: second.jpg'
    );
    expect(mockSetField).toHaveBeenCalledWith(
      'galleryMedia',
      expect.arrayContaining([expect.objectContaining({ mediaId: 'media-2', order: 1 })])
    );
    expect(mockRegisterCreatedMedia).toHaveBeenCalledTimes(1);
  });

  it('uses the shared crop-override editor and not a caption modal', async () => {
    render(
      <StudioCardFormGallery
        disabled={false}
        onSetAsCover={jest.fn()}
        currentCoverMediaId={null}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Edit gallery item' }));

    expect(screen.getByText('Gallery crop override')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use media default crop' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Optional caption for this slot on the card')).not.toBeInTheDocument();
  });

  it('persists gallery removal immediately through the shared gallery save path', async () => {
    const onPersistGalleryAfterSlotSave = jest.fn(async () => true);

    render(
      <StudioCardFormGallery
        disabled={false}
        onSetAsCover={jest.fn()}
        currentCoverMediaId={null}
        onPersistGalleryAfterSlotSave={onPersistGalleryAfterSlotSave}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove from gallery' }));

    expect(mockSetField).toHaveBeenCalledWith('galleryMedia', []);
    expect(onPersistGalleryAfterSlotSave).toHaveBeenCalledWith([]);
  });
});
