process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID = 'test-project-id';
process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@example.com';
process.env.FIREBASE_STORAGE_BUCKET_URL = 'test-bucket.appspot.com';

jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn(),
  };
  const mockApp = {
    firestore: jest.fn(() => mockFirestore),
  };

  return {
    apps: [],
    initializeApp: jest.fn(),
    app: jest.fn(() => mockApp),
    credential: {
      cert: jest.fn(() => ({ projectId: 'test-project-id' })),
    },
    firestore: jest.fn(() => mockFirestore),
  };
});

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
