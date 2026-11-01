import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MediaEditModal from '@/components/admin/studio/media/MediaEditModal';
import type { Media } from '@/lib/types/photo';

const showSuccess = jest.fn();
const showError = jest.fn();
const showToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/components/admin/studio/cards/EditModal', () => ({
  __esModule: true,
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

jest.mock('@/components/common/JournalImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

jest.mock('@/components/providers/AppFeedbackProvider', () => ({
  useAppFeedback: () => ({
    showSuccess,
    showError,
    showToast,
    confirm: jest.fn(),
    alert: jest.fn(),
  }),
}));

const media = {
  docId: 'media-1',
  filename: 'scan-before.jpg',
  width: 800,
  height: 600,
  size: 2048,
  contentType: 'image/jpeg',
  storageUrl: 'https://example.test/before.jpg',
  storagePath: 'images/before.jpg',
  source: 'local',
  sourcePath: 'scans/before.jpg',
  dimensionReview: {},
  createdAt: 1,
  updatedAt: 1,
} as Media;

describe('MediaEditModal replacement review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:replacement-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    global.fetch = jest.fn();
  });

  it('compares before and after and waits for explicit same-item confirmation', async () => {
    const updated = {
      ...media,
      filename: 'scan-after.webp',
      contentType: 'image/webp',
      readiness: {
        overall: 'ready' as const,
        stages: {},
        updatedAt: 2,
      },
    } as Media;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          review: {
            evidence: { keywords: [] },
            matchedTags: [],
            unmatchedKeywords: [],
            conflicts: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ media: updated, processingComplete: true }),
      });
    const onMediaUpdated = jest.fn();
    const { container } = render(
      <MediaEditModal
        isOpen
        mediaItems={[media]}
        selectedMediaId="media-1"
        onSelectMedia={jest.fn()}
        onClose={jest.fn()}
        onSaveMediaFields={jest.fn(async () => undefined)}
        onMediaUpdated={onMediaUpdated}
        relatedCardIdsOverride={[]}
      />
    );

    const file = new File(['replacement'], 'scan-after.webp', { type: 'image/webp' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Confirm this is the same underlying item')).toBeInTheDocument();
    expect(screen.getAllByText(/scan-before\.jpg/).length).toBeGreaterThan(0);
    expect(screen.getByText(/scan-after\.webp/)).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/images/media-1/replace',
      expect.objectContaining({ method: 'PUT' })
    );
    expect(screen.getByText('No material conflict with confirmed Media truth was found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, replace this Media item' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [, request] = (global.fetch as jest.Mock).mock.calls[1];
    const body = request.body as FormData;
    expect(request.method).toBe('POST');
    expect(body.get('sameUnderlyingMedia')).toBe('true');
    expect(body.get('file')).toBe(file);
    await waitFor(() => expect(onMediaUpdated).toHaveBeenCalledWith(updated));
    expect(showSuccess).toHaveBeenCalledWith(
      'The image was replaced without changing its caption, tags, or Story relationships.'
    );
  });

  it('keeps downstream processing failure visible after the source is accepted', async () => {
    const updated = {
      ...media,
      filename: 'scan-after.webp',
      readiness: { overall: 'failed' as const },
    } as Media;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          review: {
            evidence: { keywords: [] },
            matchedTags: [],
            unmatchedKeywords: [],
            conflicts: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          media: updated,
          processingComplete: false,
          message: 'Media asset media-1 was replaced, but some processing needs attention.',
        }),
      });
    const { container } = render(
      <MediaEditModal
        isOpen
        mediaItems={[media]}
        selectedMediaId="media-1"
        onSelectMedia={jest.fn()}
        onClose={jest.fn()}
        onSaveMediaFields={jest.fn(async () => undefined)}
        relatedCardIdsOverride={[]}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['replacement'], 'scan-after.webp', { type: 'image/webp' })] },
    });
    await screen.findByText('No material conflict with confirmed Media truth was found.');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, replace this Media item' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Image replaced; processing needs attention',
      tone: 'warning',
      persistent: true,
    })));
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('shows conflicting metadata as evidence without applying it', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        review: {
          evidence: {
            caption: 'Replacement caption',
            keywords: ['Mountains'],
            capturedAt: { raw: '2024:06:12 14:30:00', year: 2024, month: 6, day: 12 },
            gps: { latitude: 33.689, longitude: -78.886 },
          },
          matchedTags: [],
          unmatchedKeywords: ['Mountains'],
          conflicts: [
            {
              field: 'where',
              label: 'Embedded keyword differs from confirmed Where',
              confirmedValue: 'Myrtle Beach',
              replacementEvidence: 'Mountains',
            },
          ],
        },
      }),
    });
    const { container } = render(
      <MediaEditModal
        isOpen
        mediaItems={[media]}
        selectedMediaId="media-1"
        onSelectMedia={jest.fn()}
        onClose={jest.fn()}
        onSaveMediaFields={jest.fn(async () => undefined)}
        relatedCardIdsOverride={[]}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['replacement'], 'scan-after.webp', { type: 'image/webp' })] },
    });

    expect(await screen.findByText('Embedded keyword differs from confirmed Where')).toBeInTheDocument();
    expect(screen.getByText('Confirmed: Myrtle Beach')).toBeInTheDocument();
    expect(screen.getByText('Replacement file: Mountains')).toBeInTheDocument();
    expect(screen.getByText(/GPS: 33\.68900, -78\.88600/)).toBeInTheDocument();
    expect(screen.getByText(/This evidence is not applied automatically/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
