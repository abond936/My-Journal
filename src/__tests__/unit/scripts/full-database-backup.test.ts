import { serializeBackupDoc } from '@/lib/scripts/firebase/full-database-backup';

jest.mock('@/lib/config/firebase/admin', () => ({
  adminDb: {},
}));

jest.mock('@/lib/config/typesense', () => ({
  getTypesenseClient: jest.fn(),
  isTypesenseConfigured: jest.fn(() => false),
}));

describe('serializeBackupDoc', () => {
  it('preserves the Firestore document id even when stored data has a blank id field', () => {
    expect(
      serializeBackupDoc('card-123', {
        id: '',
        title: 'High School Graduation',
        status: 'draft',
      })
    ).toEqual({
      id: 'card-123',
      title: 'High School Graduation',
      status: 'draft',
    });
  });

  it('keeps other stored fields untouched', () => {
    expect(
      serializeBackupDoc('media-456', {
        caption: 'Family photo',
        nested: { focalX: 10, focalY: 20 },
      })
    ).toEqual({
      id: 'media-456',
      caption: 'Family photo',
      nested: { focalX: 10, focalY: 20 },
    });
  });
});
