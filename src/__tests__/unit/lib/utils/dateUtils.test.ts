import { serializeCardForClient } from '@/lib/utils/dateUtils';

class TimestampFixture {
  constructor(private readonly milliseconds: number) {}

  toDate() {
    return new Date(this.milliseconds);
  }

  toMillis() {
    return this.milliseconds;
  }
}

describe('serializeCardForClient', () => {
  it('recursively converts Firestore timestamps and class instances to plain client data', () => {
    const timestamp = new TimestampFixture(1_700_000_000_123);
    const card = {
      docId: 'card-1',
      createdAt: timestamp,
      updatedAt: timestamp,
      coverImage: { docId: 'media-cover', updatedAt: timestamp },
      galleryMedia: [
        {
          mediaId: 'media-1',
          order: 0,
          media: {
            docId: 'media-1',
            createdAt: timestamp,
            updatedAt: timestamp,
            renditions: [{ createdAt: timestamp }],
          },
        },
      ],
    };

    const serialized = serializeCardForClient(card)!;

    expect(serialized.createdAt).toBe(1_700_000_000_123);
    expect(serialized.updatedAt).toBe(1_700_000_000_123);
    expect((serialized.coverImage as { updatedAt: number }).updatedAt).toBe(1_700_000_000_123);
    expect(
      (serialized.galleryMedia as Array<{ media: { updatedAt: number; renditions: Array<{ createdAt: number }> } }>)[0]
        .media.updatedAt
    ).toBe(1_700_000_000_123);
    expect(
      (serialized.galleryMedia as Array<{ media: { renditions: Array<{ createdAt: number }> } }>)[0]
        .media.renditions[0].createdAt
    ).toBe(1_700_000_000_123);
    expect(Object.getPrototypeOf(serialized)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(serialized.galleryMedia![0].media)).toBe(Object.prototype);
  });
});
