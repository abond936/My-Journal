import { applyPublicStorageUrlsToMedia } from '@/lib/utils/storageUrl';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => ({
    storage: () => ({
      bucket: () => ({
        name: 'test-bucket',
      }),
    }),
  }),
}));

describe('storageUrl helpers', () => {
  it('derives public URLs for the original media and studio/reader renditions', () => {
    const next = applyPublicStorageUrlsToMedia({
      docId: 'media-1',
      storagePath: 'images/media-1.webp',
      storageUrl: '',
      renditions: {
        studio: {
          storagePath: 'images/renditions/studio/media-1.webp',
          storageUrl: '',
          width: 960,
          height: 720,
          contentType: 'image/webp',
        },
        reader: {
          storagePath: 'images/renditions/reader/media-1.webp',
          storageUrl: '',
          width: 640,
          height: 480,
          contentType: 'image/webp',
        },
      },
    });

    expect(next.storageUrl).toContain('/o/images%2Fmedia-1.webp?alt=media');
    expect(next.renditions?.studio?.storageUrl).toContain(
      '/o/images%2Frenditions%2Fstudio%2Fmedia-1.webp?alt=media'
    );
    expect(next.renditions?.reader?.storageUrl).toContain(
      '/o/images%2Frenditions%2Freader%2Fmedia-1.webp?alt=media'
    );
  });
});
