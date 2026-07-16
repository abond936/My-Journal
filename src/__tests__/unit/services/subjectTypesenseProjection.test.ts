import { buildTypesenseCardDocumentFromData } from '@/lib/services/typesenseService';
import { mediaToTypesenseDocument } from '@/lib/services/typesenseMediaService';

describe('subject-tag search projections', () => {
  it('projects card subject fields into the Typesense card document', () => {
    const doc = buildTypesenseCardDocumentFromData(
      'card-1',
      {
        title: 'Family photo',
        status: 'published',
        tags: ['siblings'],
        filterTags: { siblings: true, family: true },
        subjectTagId: 'siblings',
        subjectTagIds: ['siblings', 'alan'],
        subjectFilterTags: { siblings: true, family: true },
        createdAt: 10,
        updatedAt: 20,
      },
      new Map([
        ['siblings', 'Siblings'],
        ['family', 'Family'],
      ])
    );

    expect(doc.subject_tag_id).toBe('siblings');
    expect(doc.subject_tag_ids).toEqual(['siblings', 'alan']);
    expect(doc.subject_filter_tag_ids).toEqual(['siblings', 'family']);
  });

  it('projects media subject fields into the Typesense media document', () => {
    const doc = mediaToTypesenseDocument(
      {
        docId: 'media-1',
        filename: 'brothers.jpg',
        width: 100,
        height: 100,
        size: 1000,
        contentType: 'image/jpeg',
        storageUrl: 'https://example.test/brothers.jpg',
        storagePath: 'images/brothers.jpg',
        source: 'local',
        sourcePath: '/brothers.jpg',
        createdAt: 10,
        updatedAt: 20,
        tags: ['siblings'],
        subjectTagId: 'siblings',
        subjectTagIds: ['siblings', 'alan'],
        subjectFilterTags: { siblings: true, family: true },
      },
      new Map([
        ['siblings', 'Siblings'],
        ['family', 'Family'],
      ])
    );

    expect(doc.subject_tag_id).toBe('siblings');
    expect(doc.subject_tag_ids).toEqual(['siblings', 'alan']);
    expect(doc.subject_filter_tag_ids).toEqual(['siblings', 'family']);
  });
});
