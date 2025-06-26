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
    id: 'test-media-1',
    url: 'test.jpg',
    alt: 'Test image',
    type: 'image',
    width: 100,
    height: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders empty state correctly', () => {
    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('renders existing image correctly', () => {
    render(
      <CoverPhotoContainer
        coverImage={mockMedia}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByAltText('Test image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('handles image removal', async () => {
    render(
      <CoverPhotoContainer
        coverImage={mockMedia}
        onChange={mockOnChange}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('handles file drop', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMedia),
    });

    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropzone = screen.getByText(/drag and drop/i);

    Object.defineProperty(dropzone, 'getBoundingClientRect', {
      value: () => ({
        bottom: 100,
        height: 100,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    await userEvent.upload(dropzone, file);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/images/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(mockMedia);
    });
  });

  it('handles upload error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropzone = screen.getByText(/drag and drop/i);

    await userEvent.upload(dropzone, file);

    expect(await screen.findByText(/failed to upload/i)).toBeInTheDocument();
  });

  it('shows loading state during upload', async () => {
    let resolveUpload: (value: any) => void;
    const uploadPromise = new Promise(resolve => {
      resolveUpload = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(() => uploadPromise);

    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
      />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropzone = screen.getByText(/drag and drop/i);

    await userEvent.upload(dropzone, file);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();

    resolveUpload!({
      ok: true,
      json: () => Promise.resolve(mockMedia),
    });
  });

  it('shows error state', () => {
    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
        error="Invalid image"
      />
    );

    expect(screen.getByText('Invalid image')).toBeInTheDocument();
  });

  it('handles drag events', async () => {
    render(
      <CoverPhotoContainer
        coverImage={null}
        onChange={mockOnChange}
      />
    );

    const dropzone = screen.getByText(/drag and drop/i);

    fireEvent.dragEnter(dropzone);
    expect(screen.getByText(/drop the image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(dropzone);
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });
}); 