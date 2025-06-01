import { adminDb } from '../admin';

describe('Firebase Admin Configuration', () => {
  it('should initialize admin database', () => {
    expect(adminDb).toBeDefined();
  });

  it('should have collection method', () => {
    expect(adminDb.collection).toBeDefined();
  });

  it('should have doc method', () => {
    expect(adminDb.doc).toBeDefined();
  });
}); 