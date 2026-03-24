import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoverPhotoContainer from '@/components/admin/card-admin/CoverPhotoContainer';
import { Media } from '@/lib/types/photo';

// Mock next/image
jest.mock('next/image', () => {
  return function MockImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />;
  };
});

describe('CoverPhotoContainer', () => {
  const mockOnChange = jest.fn();
  const mockMedia: Media = {
    docId: 'test-media-1',
    filename: 'test.jpg',
    width: 100,
    height: 100,
    size: 1024,
    contentType: 'image/jpeg',
    storageUrl: 'https://example.com/test.jpg',
    storagePath: 'images/test-media-1-test.jpg',
    source: 'paste',
    sourcePath: 'upload://test.jpg',
    createdAt: 0,
    updatedAt: 0,
  };

  const renderWithProps = (props: Partial<React.ComponentProps<typeof CoverPhotoContainer>> = {}) =>
    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
        isSaving={false}
        {...props}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders empty state correctly', () => {
    renderWithProps();

    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('renders existing image correctly', () => {
    renderWithProps({ coverImage: mockMedia });

    expect(screen.getByAltText('test.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('handles image removal', async () => {
    renderWithProps({ coverImage: mockMedia });

    const removeButton = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('handles file drop', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mediaId: mockMedia.docId, media: mockMedia }),
    });

    const { container } = renderWithProps();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    await userEvent.upload(input!, file);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/images/browser',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(mockMedia, '50% 50%');
    });
  });

  it('handles upload error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

    const { container } = renderWithProps();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input!, file);

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
  });

  it('shows loading state during upload', async () => {
    let resolveUpload: (value: unknown) => void;
    const uploadPromise = new Promise(resolve => {
      resolveUpload = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(() => uploadPromise);

    const { container } = renderWithProps();

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input!, file);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();

    resolveUpload!({
      ok: true,
      json: () => Promise.resolve({ mediaId: mockMedia.docId, media: mockMedia }),
    });
  });

  it('shows error state', () => {
    renderWithProps({ error: 'Invalid image' });

    expect(screen.getByText('Invalid image')).toBeInTheDocument();
  });

  it('handles drag events', async () => {
    renderWithProps();

    const dropzone = screen.getByTestId('cover-dropzone');
    const file = new File(['x'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.dragEnter(dropzone, {
      dataTransfer: {
        types: ['Files'],
        items: [{ kind: 'file', type: 'image/jpeg', getAsFile: () => file }],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/drop the image here/i)).toBeInTheDocument();
    });

    fireEvent.dragLeave(dropzone, {
      dataTransfer: { types: [] },
    });

    await waitFor(() => {
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    });
  });
}); 