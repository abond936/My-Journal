/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoPicker from '@/components/admin/card-admin/PhotoPicker';
import MediaLocalImportDialog from '@/components/admin/media-admin/MediaLocalImportDialog';

jest.mock('next/image', () => {
  return function MockImage({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) {
    return <img src={src} alt={alt} className={className} />;
  };
});

jest.mock('@/components/providers/TagProvider', () => ({
  useTag: () => ({ tags: [] }),
}));

describe('media picker ownership boundaries', () => {
  const folderTree = [
    {
      id: 'folder-1',
      name: 'Album 1',
      children: [{ id: 'folder-1/child-a', name: 'Child A', children: [] }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/images/local/folder-tree') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(folderTree),
        } as Response);
      }
      if (url === '/api/images/local/folder-contents') {
        const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? '{}')) as { folderPath?: string };
        const photosByFolder: Record<string, Array<{ id: string; filename: string; width: number; height: number; sourcePath: string; storageUrl: string }>> = {
          'folder-1': [
            {
              id: 'folder-1/photo-1.jpg',
              filename: 'photo-1.jpg',
              width: 100,
              height: 100,
              sourcePath: 'folder-1/photo-1.jpg',
              storageUrl: '/api/images/local/file?path=folder-1%2Fphoto-1.jpg',
            },
          ],
          'folder-1/child-a': [
            {
              id: 'folder-1/child-a/photo-2.jpg',
              filename: 'photo-2.jpg',
              width: 120,
              height: 80,
              sourcePath: 'folder-1/child-a/photo-2.jpg',
              storageUrl: '/api/images/local/file?path=folder-1%2Fchild-a%2Fphoto-2.jpg',
            },
          ],
        };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(photosByFolder[body.folderPath ?? ''] ?? []),
          text: () => Promise.resolve(''),
        } as Response);
      }
      if (url.startsWith('/api/media?')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              media: [],
              pagination: {
                limit: 40,
                hasNext: false,
                nextCursor: null,
                nextListPage: null,
                engine: 'firestore',
              },
            }),
        } as Response);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as jest.Mock;
  });

  it('keeps the shared PhotoPicker on local-first open and only loads library after explicit tab switch', async () => {
    render(
      <PhotoPicker
        isOpen
        onClose={jest.fn()}
        onSelect={jest.fn()}
        initialMode="single"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images/local/folder-tree');
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/images/local/folder-contents',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(screen.getByRole('button', { name: 'Collapse Album 1' })).toBeInTheDocument();
    expect(screen.getByText('photo-1.jpg')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'This PC' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument();
    expect(
      (global.fetch as jest.Mock).mock.calls.some((call) => String(call[0]).startsWith('/api/media?'))
    ).toBe(false);

    await userEvent.click(screen.getByRole('tab', { name: 'Library' }));

    await waitFor(() => {
      expect(
        (global.fetch as jest.Mock).mock.calls.some((call) => String(call[0]).startsWith('/api/media?'))
      ).toBe(true);
    });
  });

  it('keeps the Media local import dialog source-only and never touches library fetches', async () => {
    render(
      <MediaLocalImportDialog
        isOpen
        onClose={jest.fn()}
        onImportComplete={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images/local/folder-tree');
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/images/local/folder-contents',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(screen.queryByRole('tab', { name: 'Library' })).not.toBeInTheDocument();
    expect(
      (global.fetch as jest.Mock).mock.calls.some((call) => String(call[0]).startsWith('/api/media?'))
    ).toBe(false);
  });

  it('updates Media dialog photos when a nested folder is selected', async () => {
    render(
      <MediaLocalImportDialog
        isOpen
        onClose={jest.fn()}
        onImportComplete={jest.fn()}
      />
    );

    expect(await screen.findByAltText('photo-1.jpg')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Child A'));

    await waitFor(() => {
      expect(screen.getByAltText('photo-2.jpg')).toBeInTheDocument();
    });
    expect(screen.queryByAltText('photo-1.jpg')).not.toBeInTheDocument();
  });

  it('remembers the shared PhotoPicker tree expansion state across reopen', async () => {
    const { rerender } = render(
      <PhotoPicker
        isOpen
        onClose={jest.fn()}
        onSelect={jest.fn()}
        initialMode="single"
      />
    );

    expect(await screen.findByText('Child A')).toBeInTheDocument();

    await userEvent.dblClick(screen.getByText('Album 1'));

    await waitFor(() => {
      expect(screen.queryByText('Child A')).not.toBeInTheDocument();
    });

    rerender(
      <PhotoPicker
        isOpen={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        initialMode="single"
      />
    );

    rerender(
      <PhotoPicker
        isOpen
        onClose={jest.fn()}
        onSelect={jest.fn()}
        initialMode="single"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images/local/folder-tree');
    });
    expect(screen.queryByText('Child A')).not.toBeInTheDocument();
  });
});
