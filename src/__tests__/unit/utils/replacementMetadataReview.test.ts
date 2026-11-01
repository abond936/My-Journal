import { buildReplacementMetadataReview } from '@/lib/utils/replacementMetadataReview';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';

const baseMedia = {
  docId: 'media-1',
  filename: 'scan.jpg',
  width: 100,
  height: 100,
  size: 100,
  contentType: 'image/jpeg',
  storageUrl: 'url',
  storagePath: 'images/scan.jpg',
  source: 'local',
  sourcePath: 'scan.jpg',
  createdAt: 1,
  updatedAt: 1,
} as Media;

const tags: Tag[] = [
  { docId: 'family', name: 'Family', dimension: 'who' },
  { docId: 'charlie', name: 'Charlie', dimension: 'who', path: ['family'] },
  { docId: 'beach', name: 'Beach', dimension: 'where' },
  { docId: 'myrtle', name: 'Myrtle Beach', dimension: 'where', path: ['beach'] },
  { docId: 'mountains', name: 'Mountains', dimension: 'where' },
];

describe('replacement metadata review', () => {
  it('reports material caption, date, and recognized classification conflicts', () => {
    const result = buildReplacementMetadataReview(
      {
        ...baseMedia,
        caption: 'Original caption',
        tags: ['charlie', 'myrtle'],
        temporal: {
          status: 'known',
          year: 2023,
          month: 5,
          day: 1,
          precision: 'day',
          approximate: false,
          source: 'manual',
        },
        dimensionReview: {
          who: { reviewed: true },
          when: { reviewed: true },
          where: { reviewed: true },
        },
      },
      {
        caption: 'Replacement caption',
        keywordStrings: ['Charlie', 'Mountains', 'unmapped'],
        capturedAt: { raw: '2024:06:12 14:30:00', year: 2024, month: 6, day: 12, hour: 14, minute: 30 },
        gps: { latitude: 33.689, longitude: -78.886 },
      },
      tags
    );

    expect(result.conflicts.map((conflict) => conflict.field)).toEqual(['caption', 'when', 'where']);
    expect(result.matchedTags.map((match) => match.name)).toEqual(['Charlie', 'Mountains']);
    expect(result.unmatchedKeywords).toEqual(['unmapped']);
    expect(result.evidence.gps).toEqual({ latitude: 33.689, longitude: -78.886 });
  });

  it('treats parent and child taxonomy evidence as compatible', () => {
    const result = buildReplacementMetadataReview(
      {
        ...baseMedia,
        tags: ['family', 'beach'],
        dimensionReview: {
          who: { reviewed: true },
          where: { reviewed: true },
        },
      },
      {
        caption: '',
        keywordStrings: ['Charlie', 'Myrtle Beach'],
      },
      tags
    );

    expect(result.conflicts).toEqual([]);
  });

  it('flags evidence against an author-confirmed Unknown resolution', () => {
    const result = buildReplacementMetadataReview(
      {
        ...baseMedia,
        dimensionReview: {
          who: { reviewed: true, resolution: 'unknown' },
        },
      },
      { caption: '', keywordStrings: ['Charlie'] },
      tags
    );

    expect(result.conflicts).toEqual([
      expect.objectContaining({
        field: 'who',
        confirmedValue: 'Unknown',
        replacementEvidence: 'Charlie',
      }),
    ]);
  });
});
